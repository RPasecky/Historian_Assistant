import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { EnrichedEvent, GraphNode, GraphLink } from '../types';

interface NetworkGraphProps {
  events: EnrichedEvent[];
  onSelectEvent: (id: string) => void;
}

export const NetworkGraph: React.FC<NetworkGraphProps> = ({ events, onSelectEvent }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // Handle Resize
  useEffect(() => {
    const updateSize = () => {
        if (containerRef.current) {
            setDimensions({
                width: containerRef.current.clientWidth,
                height: containerRef.current.clientHeight
            });
        }
    };
    window.addEventListener('resize', updateSize);
    updateSize();
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    if (!events.length || !svgRef.current) return;

    // Build Graph Data
    // Nodes: People + Locations
    // Links: Person <-> Location (via Event), Person <-> Person (via Co-occurrence in Event)
    
    const nodesMap = new Map<string, GraphNode>();
    const links: GraphLink[] = [];

    events.forEach(event => {
        // Add Location Node
        if (event.location) {
            if (!nodesMap.has(event.location.id)) {
                nodesMap.set(event.location.id, {
                    id: event.location.id,
                    group: 2,
                    radius: 6,
                    label: event.location.name,
                    type: 'LOCATION'
                });
            }
        }

        // Add Person Nodes and Links
        event.people.forEach(person => {
            if (!nodesMap.has(person.id)) {
                nodesMap.set(person.id, {
                    id: person.id,
                    group: 1,
                    radius: 8,
                    label: person.name,
                    type: 'PERSON'
                });
            }

            // Link Person to Location
            if (event.location) {
                links.push({
                    source: person.id,
                    target: event.location.id,
                    value: 1,
                    type: 'LOCATED_AT'
                });
            }

            // Link People to each other (Co-occurrence)
            event.people.forEach(other => {
                if (person.id !== other.id) {
                    // Check if link exists
                    const exists = links.find(l => 
                        (l.source === person.id && l.target === other.id) || 
                        (l.source === other.id && l.target === person.id)
                    );
                    if (!exists) {
                         links.push({
                            source: person.id,
                            target: other.id,
                            value: 2,
                            type: 'PARTICIPATED'
                        });
                    }
                }
            });
        });
    });

    const nodes = Array.from(nodesMap.values());

    // D3 Simulation
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); 

    const simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id((d: any) => d.id).distance(80))
      .force("charge", d3.forceManyBody().strength(-200))
      .force("center", d3.forceCenter(dimensions.width / 2, dimensions.height / 2))
      .force("collide", d3.forceCollide().radius((d: any) => d.radius + 10));

    // Draw Links
    const link = svg.append("g")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.3)
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke-width", d => Math.sqrt(d.value))
      .attr("stroke", d => d.type === 'PARTICIPATED' ? "#f59e0b" : "#a8a29e");

    // Draw Nodes
    const node = svg.append("g")
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .selectAll("circle")
      .data(nodes)
      .join("circle")
      .attr("r", d => d.radius)
      .attr("fill", d => d.type === 'PERSON' ? "#f59e0b" : "#78716c")
      .call(drag(simulation) as any);

    // Draw Labels
    const labels = svg.append("g")
        .selectAll("text")
        .data(nodes)
        .enter().append("text")
        .text(d => d.label)
        .attr("font-size", d => d.type === 'PERSON' ? 10 : 8)
        .attr("dx", 10)
        .attr("dy", 3)
        .attr("fill", "#44403c")
        .style("pointer-events", "none")
        .style("font-family", "sans-serif")
        .style("opacity", 0.8);

    node.on("click", (event, d) => {
        // Simple logic: select first event associated with this entity
        const relatedEvent = events.find(e => 
            e.people.some(p => p.id === d.id) || 
            (e.location && e.location.id === d.id)
        );
        if (relatedEvent) onSelectEvent(relatedEvent.id);
    });

    node.append("title").text(d => d.label);

    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node
        .attr("cx", (d: any) => d.x)
        .attr("cy", (d: any) => d.y);
      
      labels
        .attr("x", (d: any) => d.x)
        .attr("y", (d: any) => d.y);
    });

    return () => { simulation.stop(); };

  }, [events, dimensions]);

  // Drag behavior
  const drag = (simulation: d3.Simulation<GraphNode, undefined>) => {
    function dragstarted(event: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }
    function dragged(event: any) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }
    function dragended(event: any) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }
    return d3.drag()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended);
  };

  if (events.length === 0) {
     return <div className="flex items-center justify-center h-full text-stone-500">No connections to display.</div>
  }

  return (
    <div ref={containerRef} className="w-full h-full bg-stone-50 rounded-xl shadow-inner border border-stone-200 overflow-hidden relative">
      <div className="absolute top-4 left-4 bg-white/80 backdrop-blur p-2 rounded border border-stone-200 shadow text-xs text-stone-600 z-10 pointer-events-none">
        <div className="flex items-center gap-2 mb-1"><span className="w-2 h-2 rounded-full bg-amber-500"></span> Person</div>
        <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-stone-500"></span> Location</div>
      </div>
      <svg ref={svgRef} width="100%" height="100%"></svg>
    </div>
  );
};
