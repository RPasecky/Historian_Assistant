import { v4 as uuidv4 } from 'uuid';
import { Book, Person, Location, Event, EventPerson, EventLocation, Precision } from '../types';

// Constants for IDs to ensure relationships work
const BOOKS = {
    HISTORY_NYC: uuidv4()
};

const PEOPLE = {
    LANGSTON_HUGHES: uuidv4(),
    ZORA_NEALE_HURSTON: uuidv4(),
    DUKE_ELLINGTON: uuidv4(),
    JACK_KEROUAC: uuidv4(),
    ALLEN_GINSBERG: uuidv4(),
    WILLIAM_BURROUGHS: uuidv4(),
    JACKSON_POLLOCK: uuidv4(),
    LEE_KRASNER: uuidv4(),
    DYLAN_THOMAS: uuidv4(),
    PEGGY_GUGGENHEIM: uuidv4()
};

const LOCATIONS = {
    HARLEM_YMCA: uuidv4(),
    COTTON_CLUB: uuidv4(),
    COLUMBIA_UNI: uuidv4(),
    CEDAR_TAVERN: uuidv4(),
    HOTEL_CHELSEA: uuidv4(),
    WHITE_HORSE: uuidv4(),
    ART_OF_THIS_CENTURY: uuidv4(),
    SAVOY_BALLROOM: uuidv4(),
    SAN_REMO: uuidv4(),
    CITY_LIGHTS_OFFICE: uuidv4() // NY office placeholder
};

// 1. Books
export const mockBooks: Book[] = [
    { id: BOOKS.HISTORY_NYC, title: "Bohemian Manhattan", author: "Historian AI", publication_year: 2024 }
];

// 2. People
export const mockPeople: Person[] = [
    { id: PEOPLE.LANGSTON_HUGHES, name: "Langston Hughes", aliases: ["James Mercer Langston Hughes"], book_id: BOOKS.HISTORY_NYC, birth_year: 1902, death_year: 1967 },
    { id: PEOPLE.ZORA_NEALE_HURSTON, name: "Zora Neale Hurston", aliases: ["Queen of the Harlem Renaissance"], book_id: BOOKS.HISTORY_NYC, birth_year: 1891, death_year: 1960 },
    { id: PEOPLE.DUKE_ELLINGTON, name: "Duke Ellington", aliases: ["Edward Kennedy Ellington"], book_id: BOOKS.HISTORY_NYC, birth_year: 1899, death_year: 1974 },
    { id: PEOPLE.JACK_KEROUAC, name: "Jack Kerouac", aliases: ["Jean-Louis Lebris de Kerouac"], book_id: BOOKS.HISTORY_NYC, birth_year: 1922, death_year: 1969 },
    { id: PEOPLE.ALLEN_GINSBERG, name: "Allen Ginsberg", aliases: [], book_id: BOOKS.HISTORY_NYC, birth_year: 1926, death_year: 1997 },
    { id: PEOPLE.WILLIAM_BURROUGHS, name: "William S. Burroughs", aliases: ["Old Bull Lee"], book_id: BOOKS.HISTORY_NYC, birth_year: 1914, death_year: 1997 },
    { id: PEOPLE.JACKSON_POLLOCK, name: "Jackson Pollock", aliases: ["Jack the Dripper"], book_id: BOOKS.HISTORY_NYC, birth_year: 1912, death_year: 1956 },
    { id: PEOPLE.LEE_KRASNER, name: "Lee Krasner", aliases: [], book_id: BOOKS.HISTORY_NYC, birth_year: 1908, death_year: 1984 },
    { id: PEOPLE.DYLAN_THOMAS, name: "Dylan Thomas", aliases: [], book_id: BOOKS.HISTORY_NYC, birth_year: 1914, death_year: 1953 },
    { id: PEOPLE.PEGGY_GUGGENHEIM, name: "Peggy Guggenheim", aliases: [], book_id: BOOKS.HISTORY_NYC, birth_year: 1898, death_year: 1979 },
];

// 3. Locations
export const mockLocations: Location[] = [
    { id: LOCATIONS.HARLEM_YMCA, name: "Harlem YMCA", book_id: BOOKS.HISTORY_NYC, neighborhood: "Harlem", latitude: 40.8153, longitude: -73.9436 },
    { id: LOCATIONS.COTTON_CLUB, name: "The Cotton Club", book_id: BOOKS.HISTORY_NYC, neighborhood: "Harlem", latitude: 40.8174, longitude: -73.9575 },
    { id: LOCATIONS.COLUMBIA_UNI, name: "Columbia University", book_id: BOOKS.HISTORY_NYC, neighborhood: "Morningside Heights", latitude: 40.8075, longitude: -73.9626 },
    { id: LOCATIONS.CEDAR_TAVERN, name: "Cedar Tavern", book_id: BOOKS.HISTORY_NYC, neighborhood: "Greenwich Village", latitude: 40.7323, longitude: -73.9961 },
    { id: LOCATIONS.HOTEL_CHELSEA, name: "Hotel Chelsea", book_id: BOOKS.HISTORY_NYC, neighborhood: "Chelsea", latitude: 40.7447, longitude: -73.9969 },
    { id: LOCATIONS.WHITE_HORSE, name: "White Horse Tavern", book_id: BOOKS.HISTORY_NYC, neighborhood: "West Village", latitude: 40.7359, longitude: -74.0054 },
    { id: LOCATIONS.ART_OF_THIS_CENTURY, name: "Art of This Century Gallery", book_id: BOOKS.HISTORY_NYC, neighborhood: "Midtown", latitude: 40.7630, longitude: -73.9760 },
    { id: LOCATIONS.SAVOY_BALLROOM, name: "Savoy Ballroom", book_id: BOOKS.HISTORY_NYC, neighborhood: "Harlem", latitude: 40.8184, longitude: -73.9429 },
    { id: LOCATIONS.SAN_REMO, name: "San Remo Cafe", book_id: BOOKS.HISTORY_NYC, neighborhood: "Greenwich Village", latitude: 40.7303, longitude: -74.0006 },
    { id: LOCATIONS.CITY_LIGHTS_OFFICE, name: "Beat Generation Hangout (Generic)", book_id: BOOKS.HISTORY_NYC, neighborhood: "Greenwich Village", latitude: 40.7310, longitude: -74.0010 }
];

// 4. Events (The 20 points)
const createEvent = (desc: string, year: number, date: string, locId: string, personIds: string[]): { event: Event, ep: EventPerson[], el: EventLocation } => {
    const id = uuidv4();
    return {
        event: { id, description: desc, book_id: BOOKS.HISTORY_NYC, year, event_date: date, date_precision: Precision.EXACT },
        ep: personIds.map(pid => ({ event_id: id, person_id: pid })),
        el: { event_id: id, location_id: locId }
    };
};

const rawEvents = [
    // Harlem Renaissance
    createEvent("Langston Hughes arrives in Harlem and stays at the YMCA, meeting fellow writers.", 1921, "1921-09-04", LOCATIONS.HARLEM_YMCA, [PEOPLE.LANGSTON_HUGHES]),
    createEvent("Duke Ellington begins his residency at the Cotton Club, broadcasting Harlem Jazz to the world.", 1927, "1927-12-04", LOCATIONS.COTTON_CLUB, [PEOPLE.DUKE_ELLINGTON]),
    createEvent("Zora Neale Hurston and Langston Hughes organize 'Fire!!', a literary magazine collaboration.", 1926, "1926-11-01", LOCATIONS.HARLEM_YMCA, [PEOPLE.ZORA_NEALE_HURSTON, PEOPLE.LANGSTON_HUGHES]),
    createEvent("Legendary dance battle at the Savoy Ballroom where the Lindy Hop gains fame.", 1928, "1928-03-12", LOCATIONS.SAVOY_BALLROOM, [PEOPLE.DUKE_ELLINGTON]),
    
    // Abstract Expressionism
    createEvent("Peggy Guggenheim opens Art of This Century gallery, showcasing Pollock.", 1942, "1942-10-20", LOCATIONS.ART_OF_THIS_CENTURY, [PEOPLE.PEGGY_GUGGENHEIM, PEOPLE.JACKSON_POLLOCK]),
    createEvent("Jackson Pollock and Lee Krasner meet at an exhibition, starting a tumultuous partnership.", 1942, "1942-01-15", LOCATIONS.ART_OF_THIS_CENTURY, [PEOPLE.JACKSON_POLLOCK, PEOPLE.LEE_KRASNER]),
    createEvent("Pollock gets banned from the Cedar Tavern for tearing the door off the men's room.", 1952, "1952-05-10", LOCATIONS.CEDAR_TAVERN, [PEOPLE.JACKSON_POLLOCK]),
    createEvent("Lee Krasner argues with Pollock about his drinking at the Cedar Tavern.", 1951, "1951-08-22", LOCATIONS.CEDAR_TAVERN, [PEOPLE.LEE_KRASNER, PEOPLE.JACKSON_POLLOCK]),
    
    // Beat Generation
    createEvent("Jack Kerouac meets Allen Ginsberg at Columbia University.", 1944, "1944-09-05", LOCATIONS.COLUMBIA_UNI, [PEOPLE.JACK_KEROUAC, PEOPLE.ALLEN_GINSBERG]),
    createEvent("William S. Burroughs introduces Kerouac and Ginsberg to the underworld of Times Square.", 1945, "1945-02-15", LOCATIONS.COLUMBIA_UNI, [PEOPLE.WILLIAM_BURROUGHS, PEOPLE.JACK_KEROUAC, PEOPLE.ALLEN_GINSBERG]),
    createEvent("The 'Scroll' version of On The Road is typed by Kerouac in a marathon session in Chelsea.", 1951, "1951-04-02", LOCATIONS.HOTEL_CHELSEA, [PEOPLE.JACK_KEROUAC]),
    createEvent("Ginsberg reads 'Howl' drafts to Kerouac at the San Remo Cafe.", 1955, "1955-06-10", LOCATIONS.SAN_REMO, [PEOPLE.ALLEN_GINSBERG, PEOPLE.JACK_KEROUAC]),
    createEvent("Dylan Thomas drinks his famous '18 straight whiskies' at the White Horse Tavern.", 1953, "1953-11-03", LOCATIONS.WHITE_HORSE, [PEOPLE.DYLAN_THOMAS]),
    createEvent("Burroughs writes portions of Naked Lunch while staying at the Chelsea.", 1959, "1959-03-12", LOCATIONS.HOTEL_CHELSEA, [PEOPLE.WILLIAM_BURROUGHS]),
    
    // Crossovers
    createEvent("Beat writers clash with Abstract Expressionists in a heated debate at Cedar Tavern.", 1954, "1954-07-14", LOCATIONS.CEDAR_TAVERN, [PEOPLE.JACK_KEROUAC, PEOPLE.JACKSON_POLLOCK]),
    createEvent("Langston Hughes mentors young writers near Columbia.", 1948, "1948-05-20", LOCATIONS.COLUMBIA_UNI, [PEOPLE.LANGSTON_HUGHES, PEOPLE.ALLEN_GINSBERG]),
    createEvent("Peggy Guggenheim hosts a party attended by surrealists and future beats.", 1945, "1945-12-31", LOCATIONS.ART_OF_THIS_CENTURY, [PEOPLE.PEGGY_GUGGENHEIM, PEOPLE.WILLIAM_BURROUGHS]),
    createEvent("Dylan Thomas stays at the Chelsea Hotel, crossing paths with Arthur Miller.", 1953, "1953-10-15", LOCATIONS.HOTEL_CHELSEA, [PEOPLE.DYLAN_THOMAS]),
    createEvent("Kerouac visits the Savoy to hear authentic bop, influencing his prose.", 1949, "1949-11-05", LOCATIONS.SAVOY_BALLROOM, [PEOPLE.JACK_KEROUAC]),
    createEvent("Ginsberg and Pollock share a silent nod at the San Remo.", 1954, "1954-02-28", LOCATIONS.SAN_REMO, [PEOPLE.ALLEN_GINSBERG, PEOPLE.JACKSON_POLLOCK]),
];

export const mockEvents = rawEvents.map(r => r.event);
export const mockEventPeople = rawEvents.flatMap(r => r.ep);
export const mockEventLocations = rawEvents.map(r => r.el);

