/* SELLENCE-TOURENPLANER (SAP) – OSRM v1 (kostenlos) */
const $ = (id)=>document.getElementById(id);

let ACCOUNT = localStorage.getItem("sellence_tour_account_v1") || "sellence";
const STORE_BASE = {
  markets: "sellence_sap_markets_osrm_v1",
  route: "sellence_sap_route_osrm_v1",
  myPos: "sellence_sap_mypos_osrm_v1",
  lastLinks: "sellence_sap_lastlinks_osrm_v1",
  history: "sellence_sap_tour_history_v1",
};
function storeFor(account){
  if(account === "franco"){
    return {
      markets: STORE_BASE.markets + "_franco",
      route: STORE_BASE.route + "_franco",
      myPos: STORE_BASE.myPos + "_franco",
      lastLinks: STORE_BASE.lastLinks + "_franco",
      history: STORE_BASE.history + "_franco",
    };
  }
  return STORE_BASE;
}
let STORE = storeFor(ACCOUNT);

const AUTH_PASSWORDS = { sellence: "sellence", franco: "franco" };
const SESSION_UNLOCK_KEY = "sellence_tour_unlocked_v1";
const isUnlocked = () => sessionStorage.getItem(SESSION_UNLOCK_KEY) === "1";

const OSRM_BASE = "https://router.project-osrm.org";
const NOMINATIM = "https://nominatim.openstreetmap.org/search";

// Märkte, die im Tourenplaner ignoriert werden sollen
// (Case-insensitive, Treffer per "includes")
const IGNORE_MARKETS_SELLENCE = [
  "rossmann",
  "aldi",
  "lidl",
  "netto",
  "penny",
];
const IGNORE_MARKETS_FRANCO = [
  "rossmann",
  "aldi",
  "lidl",
  "netto",
];
let IGNORE_MARKETS = (ACCOUNT === "franco") ? IGNORE_MARKETS_FRANCO : IGNORE_MARKETS_SELLENCE;

const PRELOADED_FRANCO_MARKETS = [{"ninox": "150937", "sap": "2007773", "name": "REWE", "anschrift": "BORSTELER CHAUSSEE 17-25", "plz": "22453", "ort": "HAMBURG"}, {"ninox": "150945", "sap": "2014193", "name": "REWE", "anschrift": "ULZBURGER STR. 332", "plz": "22846", "ort": "NORDERSTEDT"}, {"ninox": "150949", "sap": "2014895", "name": "REWE", "anschrift": "KLEINER REITWEG 30", "plz": "25421", "ort": "PINNEBERG"}, {"ninox": "150952", "sap": "2016204", "name": "REWE", "anschrift": "HOHELUFTCHAUSSEE  23-25", "plz": "20253", "ort": "HAMBURG"}, {"ninox": "150959", "sap": "2018870", "name": "REWE", "anschrift": "AM MARKT 10", "plz": "25474", "ort": "BÖNNINGSTEDT"}, {"ninox": "150962", "sap": "2020024", "name": "REWE", "anschrift": "ELBGAUSTR. 1 IM EIDELSTEDT CENTER", "plz": "22523", "ort": "HAMBURG"}, {"ninox": "150965", "sap": "2021141", "name": "REWE CENTER", "anschrift": "FRIEDRICH-EBERT-ALLEE 3-11", "plz": "22869", "ort": "SCHENEFELD"}, {"ninox": "150967", "sap": "2021199", "name": "REWE", "anschrift": "LINDENWEG 2", "plz": "25436", "ort": "TORNESCH"}, {"ninox": "150969", "sap": "2021892", "name": "REWE", "anschrift": "GRELCKSTR. 34", "plz": "22529", "ort": "HAMBURG"}, {"ninox": "150970", "sap": "2022290", "name": "REWE", "anschrift": "BARNERSTR. 44-46", "plz": "22765", "ort": "HAMBURG"}, {"ninox": "150978", "sap": "2025464", "name": "REWE", "anschrift": "TIBARG 32", "plz": "22459", "ort": "HAMBURG"}, {"ninox": "150984", "sap": "2028040", "name": "REWE", "anschrift": "VON-SAUER-STR. 11-13", "plz": "22761", "ort": "HAMBURG"}, {"ninox": "150993", "sap": "2032873", "name": "REWE Kim Ide oHG", "anschrift": "WESTERSTR. 34", "plz": "25336", "ort": "ELMSHORN"}, {"ninox": "150997", "sap": "2039027", "name": "REWE", "anschrift": "RUGENBARG 7", "plz": "22549", "ort": "HAMBURG"}, {"ninox": "151000", "sap": "2044436", "name": "REWE", "anschrift": "GLISSMANNWEG 4", "plz": "22457", "ort": "HAMBURG"}, {"ninox": "151019", "sap": "2066349", "name": "REWE CITY", "anschrift": "RATHAUSALLEE 31A", "plz": "22846", "ort": "NORDERSTEDT"}, {"ninox": "151022", "sap": "2071727", "name": "REWE MARKT GMBH", "anschrift": "TIBARG 41-43", "plz": "22459", "ort": "HAMBURG"}, {"ninox": "151039", "sap": "2119743", "name": "REWE Bliesmer & Glasmeyer", "anschrift": "KIEBITZWEG 2", "plz": "22869", "ort": "SCHENEFELD"}, {"ninox": "151041", "sap": "2167027", "name": "REWE", "anschrift": "SÜLLDORFER KIRCHENWEG 2", "plz": "22587", "ort": "HAMBURG"}, {"ninox": "152982", "sap": "2062763", "name": "REWE", "anschrift": "ALSTERDORFER STR. 255", "plz": "22297", "ort": "HAMBURG"}, {"ninox": "152985", "sap": "2068041", "name": "REWE CITY", "anschrift": "ALTONAER STR. 67", "plz": "20357", "ort": "HAMBURG"}, {"ninox": "152992", "sap": "2099671", "name": "REWE", "anschrift": "WITTSTOCKER STR. 5", "plz": "25436", "ort": "UETERSEN"}, {"ninox": "153979", "sap": "2015842", "name": "MARKANT", "anschrift": "FELDBEHNSTR. 35", "plz": "25451", "ort": "QUICKBORN"}, {"ninox": "153988", "sap": "2039997", "name": "FAMILA", "anschrift": "RISSENER STR. 105", "plz": "22880", "ort": "WEDEL"}, {"ninox": "153997", "sap": "2054050", "name": "FAMILA", "anschrift": "HANS-BÖCKLER-STR. 1", "plz": "25337", "ort": "ELMSHORN"}, {"ninox": "153998", "sap": "2054183", "name": "FAMILA", "anschrift": "GROSSER SAND 96-98", "plz": "25436", "ort": "UETERSEN"}, {"ninox": "153999", "sap": "2059185", "name": "FAMILA", "anschrift": "FLENSBURGER STRAßE 3", "plz": "25421", "ort": "PINNEBERG"}, {"ninox": "154005", "sap": "2069365", "name": "FAMILA", "anschrift": "WESTRING 6", "plz": "25421", "ort": "PINNEBERG"}, {"ninox": "154253", "sap": "2019624", "name": "REWE", "anschrift": "TROPLOWITZSTR. 2-8", "plz": "22529", "ort": "HAMBURG"}, {"ninox": "154270", "sap": "2043246", "name": "REWE", "anschrift": "NEUENBROOKER STR. 37", "plz": "25361", "ort": "KREMPE"}, {"ninox": "154281", "sap": "2056914", "name": "REWE Markt GmbH", "anschrift": "EDENDORFER STR. 35", "plz": "25524", "ort": "ITZEHOE"}, {"ninox": "154283", "sap": "2057664", "name": "REWE", "anschrift": "SÜDERSTR.  10", "plz": "25709", "ort": "MARNE"}, {"ninox": "154291", "sap": "2071566", "name": "REWE", "anschrift": "KOOGSTR. 67", "plz": "25718", "ort": "FRIEDRICHSKOOG"}, {"ninox": "154300", "sap": "2089182", "name": "REWE", "anschrift": "BREITE STR. 18 A", "plz": "25551", "ort": "HOHENLOCKSTEDT"}, {"ninox": "154593", "sap": "2401690", "name": "EDEKA HAYUNGA", "anschrift": "KOPPELDAMM 29", "plz": "25335", "ort": "ELMSHORN"}, {"ninox": "154594", "sap": "2401682", "name": "EDEKA CENTER  HAYUNGA", "anschrift": "WEDENKAMP 9A", "plz": "25335", "ort": "ELMSHORN"}, {"ninox": "154595", "sap": "2402788", "name": "EDEKA C.P. JENSEN", "anschrift": "METEORSTR. 1A", "plz": "25336", "ort": "ELMSHORN"}, {"ninox": "154817", "sap": "2425305", "name": "REWE", "anschrift": "KROONHORST 1 - 3", "plz": "22549", "ort": "HAMBURG"}, {"ninox": "155005", "sap": "2022792", "name": "REWE CENTER STANISLAWSKI & LAAS", "anschrift": "DOROTHEENSTR. 116", "plz": "22301", "ort": "HAMBURG"}, {"ninox": "155006", "sap": "2425073", "name": "REWE MARKT GMBH", "anschrift": "NORDALBINGERWEG 23", "plz": "22455", "ort": "HAMBURG"}, {"ninox": "155007", "sap": "2074597", "name": "REWE CENTER", "anschrift": "OSDORFER LANDSTR. 131", "plz": "22609", "ort": "HAMBURG"}, {"ninox": "155008", "sap": "2045755", "name": "REWE CENTER", "anschrift": "MAX-BRAUER-ALLEE 59", "plz": "22765", "ort": "HAMBURG"}, {"ninox": "155009", "sap": "2003287", "name": "REWE MARKT GMBH", "anschrift": "KIELER STR.  101", "plz": "22769", "ort": "HAMBURG"}, {"ninox": "155090", "sap": "2099213", "name": "KAUFLAND", "anschrift": "NEDDERFELD 70", "plz": "22529", "ort": "HAMBURG"}, {"ninox": "155095", "sap": "2420878", "name": "REWE Kim Ide oHG", "anschrift": "AN DER OST-WEST-BRÜCKE 3", "plz": "25335", "ort": "ELMSHORN"}, {"ninox": "155664", "sap": "2401763", "name": "EDEKA L.P.JENSEN", "anschrift": "AM MARIENHOF 3", "plz": "22880", "ort": "WEDEL"}, {"ninox": "155694", "sap": "2540450", "name": "E-Center A23 GmbH", "anschrift": "RAMSKAMP 102", "plz": "25337", "ort": "ELMSHORN"}, {"ninox": "155812", "sap": "2456453", "name": "EDEKA FRISCHEMARKT VOLKER KLEIN", "anschrift": "BAHNHOFSTRASSE 31", "plz": "22880", "ort": "WEDEL"}, {"ninox": "155816", "sap": "2401767", "name": "EDEKA STRUVE CENTER", "anschrift": "HÖRGENSWEG 5", "plz": "22523", "ort": "HAMBURG"}, {"ninox": "156103", "sap": "2413371", "name": "REWE FLEMKE NICOLE", "anschrift": "MARKTSTRAßE 2", "plz": "25355", "ort": "BARMSTEDT"}, {"ninox": "157510", "sap": "2061595", "name": "REWE GM", "anschrift": "ALSTERDORFER STR. 255", "plz": "22297", "ort": "HAMBURG"}, {"ninox": "157514", "sap": "2102945", "name": "REWE GETRÄNKEMARKT", "anschrift": "BORSTELER CHAUSSEE 17-25", "plz": "22453", "ort": "HAMBURG"}, {"ninox": "157515", "sap": "2011250", "name": "REWE GETRÄNKEMARKT", "anschrift": "GLISSMANNWEG 1", "plz": "22457", "ort": "HAMBURG"}, {"ninox": "157516", "sap": "2107603", "name": "REWE GETRÄNKEMARKT", "anschrift": "RUGENBARG 7", "plz": "22549", "ort": "HAMBURG"}, {"ninox": "157518", "sap": "2106364", "name": "REWE GETRÄNKEMARKT", "anschrift": "VON-SAUER-STRAßE 11-13", "plz": "22761", "ort": "HAMBURG"}, {"ninox": "157519", "sap": "2020103", "name": "REWE GETRÄNKEMARKT", "anschrift": "ULZBURGER STR. 330", "plz": "22846", "ort": "NORDERSTEDT"}, {"ninox": "157520", "sap": "2024753", "name": "REWE GETRÄNKEMARKT", "anschrift": "FRIEDRICH-EBERT-ALLEE 3-11", "plz": "22869", "ort": "SCHENEFELD"}, {"ninox": "157530", "sap": "2050024", "name": "FAMILA", "anschrift": "KISDORFER WEG 11", "plz": "24568", "ort": "KALTENKIRCHEN"}, {"ninox": "157531", "sap": "2077490", "name": "FAMILA", "anschrift": "LOHSTÜCKER WEG 16", "plz": "24576", "ort": "BAD BRAMSTEDT"}, {"ninox": "157532", "sap": "2055670", "name": "FAMILA GM", "anschrift": "FLENSBURGER STR. 3", "plz": "25421", "ort": "PINNEBERG"}, {"ninox": "157533", "sap": "2099653", "name": "REWE GM", "anschrift": "WITTSTOCKER STR. 5", "plz": "25436", "ort": "UETERSEN"}, {"ninox": "157534", "sap": "2056164", "name": "FAMILA", "anschrift": "PASCALSTRASSE 9", "plz": "25451", "ort": "QUICKBORN"}, {"ninox": "158038", "sap": "2046617", "name": "NAHKAUF ENGELBRECHT", "anschrift": "DORFSTR. 28", "plz": "25576", "ort": "BROKDORF"}, {"ninox": "158040", "sap": "2072329", "name": "Dorfladen Alveslohe eG", "anschrift": "LINDENSTRASSE 3", "plz": "25486", "ort": "ALVESLOHE"}, {"ninox": "158578", "sap": "2425189", "name": "REWE CITY", "anschrift": "ARMINIUSSTR. 2-4A/KIELERSTR. 2", "plz": "22525", "ort": "HAMBURG"}, {"ninox": "158604", "sap": "2424988", "name": "REWE CITY", "anschrift": "EPPENDORFER WEG 192", "plz": "20253", "ort": "HAMBURG"}, {"ninox": "158605", "sap": "2425308", "name": "REWE ERICHSEN PETER", "anschrift": "DORFSTR. 105", "plz": "25336", "ort": "KLEIN NORDENDE"}, {"ninox": "158620", "sap": "2431701", "name": "KAUFLAND", "anschrift": "ECKHOFFPLATZ 1", "plz": "22547", "ort": "HAMBURG"}, {"ninox": "159153", "sap": "2090318", "name": "EDEKA PETERSEN ARNE", "anschrift": "HAFENSTR. 124", "plz": "25718", "ort": "FRIEDRICHSKOOG"}, {"ninox": "159155", "sap": "2002521", "name": "EDEKA LENDER MATTHIAS", "anschrift": "RINGSTR. 11", "plz": "25368", "ort": "KIEBITZREIHE"}, {"ninox": "159157", "sap": "2440624", "name": "EDEKA  KLIESOW", "anschrift": "BAHNHOFSTRASSE 9", "plz": "25712", "ort": "BURG (DITHMARSCHEN)"}, {"ninox": "159164", "sap": "2088967", "name": "EDEKA PIGAREW", "anschrift": "ROMAN-ZELLER-PLATZ 8", "plz": "22457", "ort": "HAMBURG"}, {"ninox": "159167", "sap": "2013623", "name": "EDEKA TOEPFERT SVEN", "anschrift": "SEESTR. 161A", "plz": "25469", "ort": "HALSTENBEK"}, {"ninox": "159173", "sap": "2405291", "name": "EDEKA MEYER PETER", "anschrift": "EKEN 2", "plz": "25563", "ort": "WRIST"}, {"ninox": "159180", "sap": "2013595", "name": "EDEKA FRISCHEMARKT EISENMANN - FROMMHOLZ", "anschrift": "HEIDREHMEN 19", "plz": "22589", "ort": "HAMBURG"}, {"ninox": "159181", "sap": "2010469", "name": "EDEKA PAULSEN", "anschrift": "IM SANDE 2", "plz": "25488", "ort": "HOLM"}, {"ninox": "159430", "sap": "2010824", "name": "EDEKA BERND TÖPFERT", "anschrift": "STRESEMANNALLEE 12-16", "plz": "22529", "ort": "HAMBURG"}, {"ninox": "159562", "sap": "2076174", "name": "GM REWE STANISLAWSKI & LAAS", "anschrift": "DOROTHEENSTR. 116", "plz": "22301", "ort": "HAMBURG"}, {"ninox": "159800", "sap": "2425812", "name": "REWE MARKT GMBH", "anschrift": "WEDELER CHAUSSEE 43B", "plz": "25436", "ort": "MOORREGE"}, {"ninox": "159856", "sap": "2002371", "name": "EDEKA MARON", "anschrift": "STEINDAMM 11", "plz": "25554", "ort": "WILSTER"}, {"ninox": "159999", "sap": "2018909", "name": "EDEKA KROEGER", "anschrift": "BLANKENESER BAHNHOFSTR. 17", "plz": "22587", "ort": "HAMBURG"}, {"ninox": "160069", "sap": "2030819", "name": "EDEKA Anders e.K.", "anschrift": "GRINDELALLEE 126", "plz": "20146", "ort": "HAMBURG"}, {"ninox": "160109", "sap": "2039842", "name": "EDEKA WUCHERPFENNIG", "anschrift": "OSTERSTR. 185-187", "plz": "20255", "ort": "HAMBURG"}, {"ninox": "160146", "sap": "2050517", "name": "NAHKAUF TARHAN", "anschrift": "GLASHÜTTENSTR. 10", "plz": "20357", "ort": "HAMBURG"}, {"ninox": "160268", "sap": "2082764", "name": "EDEKA HENNINGS", "anschrift": "HORSTER VIERECK 1", "plz": "25358", "ort": "HORST (HOLSTEIN)"}, {"ninox": "160363", "sap": "2274699", "name": "EDEKA HEITMANN", "anschrift": "GROSSE BERGSTR. 152 -162", "plz": "22767", "ort": "HAMBURG"}, {"ninox": "160425", "sap": "2431722", "name": "KAUFLAND", "anschrift": "STRESEMANNSTRAßE 300", "plz": "22761", "ort": "HAMBURG-BAHRENFELD"}, {"ninox": "160645", "sap": "2002753", "name": "GLASMEYER & CO.", "anschrift": "KALCKREUTHWEG 90", "plz": "22607", "ort": "HAMBURG"}, {"ninox": "160709", "sap": "2009490", "name": "GLASMEYER & CO", "anschrift": "WAITZSTR. 3", "plz": "22607", "ort": "HAMBURG"}, {"ninox": "160770", "sap": "2015297", "name": "EDEKA MEYERS FRISCHECENTER", "anschrift": "KRÄHENWEG 19", "plz": "22459", "ort": "HAMBURG"}, {"ninox": "160802", "sap": "2021880", "name": "NAHKAUF HAUSCHILDT", "anschrift": "AM MARKT 6", "plz": "25361", "ort": "KREMPE"}, {"ninox": "160963", "sap": "2055406", "name": "EDEKA ECKS GABRIELE", "anschrift": "ALSTERDORFER MARKT 6", "plz": "22297", "ort": "HAMBURG"}, {"ninox": "161008", "sap": "2065030", "name": "EDEKA BANDELT", "anschrift": "OTTENSER HAUPTSTR. 10", "plz": "22765", "ort": "HAMBURG"}, {"ninox": "161069", "sap": "2077479", "name": "EDEKA STRUVE CENTER", "anschrift": "GASSTR. 4", "plz": "22761", "ort": "HAMBURG"}, {"ninox": "161076", "sap": "2078274", "name": "EDEKA WIEDNER", "anschrift": "STRESEMANNSTR. 161", "plz": "22769", "ort": "HAMBURG"}, {"ninox": "161101", "sap": "2443575", "name": "EDEKA STRUVE", "anschrift": "WEDELER LANDSTR. 52", "plz": "22559", "ort": "HAMBURG"}, {"ninox": "161157", "sap": "2097681", "name": "NAH & FRISCH KAYA", "anschrift": "HOLLÄNDISCHE REIHE 50", "plz": "22765", "ort": "HAMBURG"}, {"ninox": "161463", "sap": "2061445", "name": "KAYA FEINKOST", "anschrift": "FISCHERS ALLEE 35-37", "plz": "22763", "ort": "HAMBURG"}, {"ninox": "161853", "sap": "2401750", "name": "EDEKA Hayunga’s Rugenbarg GmbH", "anschrift": "RUGENBARG 19", "plz": "22848", "ort": "NORDERSTEDT"}, {"ninox": "162057", "sap": "2441132", "name": "EDEKA NIEMERSZEIN", "anschrift": "OSTERSTR. 120", "plz": "20255", "ort": "HAMBURG"}, {"ninox": "162058", "sap": "2441133", "name": "EDEKA NIEMERSZEIN", "anschrift": "HALLERSTR. 78", "plz": "20146", "ort": "HAMBURG"}, {"ninox": "162061", "sap": "2441131", "name": "EDEKA NIEMERSZEIN", "anschrift": "OSTERSTR. 86 -90", "plz": "20259", "ort": "HAMBURG"}, {"ninox": "162062", "sap": "2441129", "name": "EDEKA NIEMERSZEIN", "anschrift": "MILCHSTR. 1", "plz": "20148", "ort": "HAMBURG"}, {"ninox": "162063", "sap": "2441122", "name": "EDEKA STRUVE SCHLEMMERMARKT", "anschrift": "POSTSTR. 33", "plz": "20354", "ort": "HAMBURG"}, {"ninox": "162065", "sap": "2007125", "name": "STRUVE W. SCHLEMMERMARKT", "anschrift": "EPPENDORFER BAUM 35-37", "plz": "20249", "ort": "HAMBURG"}, {"ninox": "162066", "sap": "2441126", "name": "STRUVE W. SCHLEMMERMARKT", "anschrift": "EPPENDORFER LANDSTR. 41", "plz": "20249", "ort": "HAMBURG"}, {"ninox": "162067", "sap": "2441136", "name": "EDEKA STRUVE CENTER", "anschrift": "OSTERFELDSTR. 30-40", "plz": "22529", "ort": "HAMBURG"}, {"ninox": "162126", "sap": "2405305", "name": "EDEKA HOLST", "anschrift": "PAUL-ROOSEN-STR. 8", "plz": "22767", "ort": "HAMBURG"}, {"ninox": "162127", "sap": "2405296", "name": "Edeka Anders e.K.", "anschrift": "MAX-BRAUER-ALLEE 163", "plz": "22765", "ort": "HAMBURG"}, {"ninox": "162129", "sap": "2405336", "name": "EDEKA AKTIV MARKT HEITMANN", "anschrift": "HOHELUFTCHAUSSEE 52-54", "plz": "20253", "ort": "HAMBURG"}, {"ninox": "162130", "sap": "2405320", "name": "EDEKA KRAUS", "anschrift": "EPPENDORFER LANDSTR. 108-110", "plz": "20249", "ort": "HAMBURG"}, {"ninox": "162132", "sap": "2405337", "name": "EDEKA KLEIN", "anschrift": "JULIUS-BRECHT-STR. 5A", "plz": "22609", "ort": "HAMBURG"}, {"ninox": "162133", "sap": "2405322", "name": "EDEKA APPEL", "anschrift": "KRUPUNDER HEIDE 2A", "plz": "25462", "ort": "RELLINGEN"}, {"ninox": "162134", "sap": "2405282", "name": "Edeka Appel e.K.", "anschrift": "Waldhof 3", "plz": "25474", "ort": "Ellerbek"}, {"ninox": "162135", "sap": "2405276", "name": "EDEKA BÖGE", "anschrift": "HAUPTSTRAßE 37-43", "plz": "25469", "ort": "HALSTENBEK"}, {"ninox": "162137", "sap": "2405295", "name": "EDEKA BÖGE", "anschrift": "NIENHOEFENER STR. 19A", "plz": "25421", "ort": "PINNEBERG"}, {"ninox": "162172", "sap": "2405339", "name": "EDEKA LÄTSCH e.K.", "anschrift": "BERLINER DAMM 7", "plz": "25479", "ort": "ELLERAU"}, {"ninox": "162368", "sap": "2157195", "name": "NETTO", "anschrift": "WEDELER CHAUSSEE 14", "plz": "25492", "ort": "HEIST"}, {"ninox": "162390", "sap": "2103397", "name": "NETTO", "anschrift": "WESTERSTR. 98", "plz": "25336", "ort": "ELMSHORN"}, {"ninox": "162452", "sap": "2445431", "name": "NETTO", "anschrift": "TORNESCHER WEG 81", "plz": "25436", "ort": "UETERSEN"}, {"ninox": "162453", "sap": "2445730", "name": "NETTO", "anschrift": "ULZBURGER LANDSTRAßE 406", "plz": "25451", "ort": "QUICKBORN-HEIDE"}, {"ninox": "162456", "sap": "2445737", "name": "NETTO", "anschrift": "KIELER STRAßE 17", "plz": "25474", "ort": "HASLOH"}, {"ninox": "162576", "sap": "2408772", "name": "EDEKA MÖLLER", "anschrift": "HAMBURGER STR. 53", "plz": "24576", "ort": "BAD BRAMSTEDT"}, {"ninox": "162650", "sap": "2407745", "name": "EDEKA ARFF", "anschrift": "MARTINISTR. 64", "plz": "20251", "ort": "HAMBURG"}, {"ninox": "162758", "sap": "2419562", "name": "REWE CITY", "anschrift": "MOORFURTHWEG 15", "plz": "22301", "ort": "HAMBURG"}, {"ninox": "164811", "sap": "2442967", "name": "REWE GM", "anschrift": "MAX-BRAUER-ALLEE 59", "plz": "22765", "ort": "HAMBURG"}, {"ninox": "164932", "sap": "2446993", "name": "REWE CITY", "anschrift": "AM FELDE 58", "plz": "22765", "ort": "HAMBURG"}, {"ninox": "164963", "sap": "2447827", "name": "REWE CITY", "anschrift": "AM TARPENUFER 3-5", "plz": "22848", "ort": "NORDERSTEDT"}, {"ninox": "165135", "sap": "2454052", "name": "REWE GLASMEYER", "anschrift": "JÜRGEN-TÖPFER-STR, 18", "plz": "22763", "ort": "HAMBURG"}, {"ninox": "165170", "sap": "2455277", "name": "E-Center Frauen", "anschrift": "LANGER PETER 27B", "plz": "25524", "ort": "ITZEHOE"}, {"ninox": "165303", "sap": "2459544", "name": "KAUFLAND", "anschrift": "RUDOLF-DIESEL-STR. 1", "plz": "25524", "ort": "ITZEHOE"}, {"ninox": "165848", "sap": "2464977", "name": "EDEKA KRAUS", "anschrift": "MITTELWEG 161", "plz": "20148", "ort": "HAMBURG"}, {"ninox": "165916", "sap": "2467687", "name": "EDEKA HAPKE", "anschrift": "AN DER STÖR 2D", "plz": "25548", "ort": "KELLINGHUSEN"}, {"ninox": "165963", "sap": "2470034", "name": "REWE CITY", "anschrift": "FRIEDENSALLEE 9", "plz": "22765", "ort": "HAMBURG"}, {"ninox": "169229", "sap": "2473277", "name": "NAHKAUF Bernd Hauschildt", "anschrift": "THEEBERG 8", "plz": "25715", "ort": "EDDELAK"}, {"ninox": "169438", "sap": "2486294", "name": "NAHKAUF TARHAN", "anschrift": "FRUCHTALLEE 123", "plz": "20259", "ort": "HAMBURG"}, {"ninox": "169464", "sap": "2493135", "name": "ROSSMANN", "anschrift": "An Der StÖr 2b", "plz": "25548", "ort": "KELLINGHUSEN"}, {"ninox": "169696", "sap": "2079274", "name": "NAHKAUF KAROL", "anschrift": "OPN HAINHOLT 2B", "plz": "22589", "ort": "HAMBURG"}, {"ninox": "170206", "sap": "2492753", "name": "Bauzentrum Sandhack GmbH", "anschrift": "Osterbrooksweg 50", "plz": "22869", "ort": "Schenefeld"}, {"ninox": "170221", "sap": "2492068", "name": "Hagebaumarkt", "anschrift": "Emmy-Noether-Str. 2", "plz": "25524", "ort": "Itzehoe"}, {"ninox": "170908", "sap": "2495327", "name": "NAHKAUF IDE - K.I. Nahkauf GmbH", "anschrift": "AM MARKT 3", "plz": "25358", "ort": "HORST"}, {"ninox": "170909", "sap": "2495328", "name": "EDEKA C.P. JENSEN", "anschrift": "HAINHOLZER DAMM 5", "plz": "25337", "ort": "ELMSHORN"}, {"ninox": "171215", "sap": "2497949", "name": "TOOM BM", "anschrift": "LISE-MEITNER-STRASSE 2", "plz": "25337", "ort": "ELMSHORN"}, {"ninox": "171233", "sap": "2497942", "name": "REWE CITY EICHEMEYER", "anschrift": "ELBCHAUSSEE 576-578", "plz": "22587", "ort": "HAMBURG"}, {"ninox": "171307", "sap": "2503912", "name": "Edeka Frauen", "anschrift": "CHRISTIAN-IV-STRASSE 23", "plz": "25348", "ort": "GLÜCKSTADT"}, {"ninox": "171461", "sap": "2508776", "name": "Rewe To Go", "anschrift": "Paul Nevermann Platz 15/16", "plz": "22765", "ort": "Hamburg"}, {"ninox": "171905", "sap": "2511052", "name": "REWE Kai Prochazka oHG", "anschrift": "Wedeler Landstr. 16-18", "plz": "22559", "ort": "Hamburg"}, {"ninox": "172127", "sap": "2513150", "name": "Rewe Regie", "anschrift": "Kieler Str. 579", "plz": "22525", "ort": "Hamburg"}, {"ninox": "172185", "sap": "2513625", "name": "EDEKA HIRCHE", "anschrift": "Harkortstrasse 81c", "plz": "22765", "ort": "Hamburg"}, {"ninox": "172198", "sap": "2002260", "name": "EDEKA BOOST", "anschrift": "Steinstr. 2", "plz": "25364", "ort": "Brande-Hörnerkirchen"}, {"ninox": "172263", "sap": "2514458", "name": "Rewe Kim Ide oHG", "anschrift": "Esinger Str. 3", "plz": "25436", "ort": "Tornesch"}, {"ninox": "172291", "sap": "2514511", "name": "K.I. NAHKAUF GmbH", "anschrift": "Sibirien 4", "plz": "25335", "ort": "Elmshorn"}, {"ninox": "172293", "sap": "2514499", "name": "TOOM BAUMARKT", "anschrift": "Westring 10", "plz": "25421", "ort": "Pinneberg"}, {"ninox": "172295", "sap": "2514510", "name": "NAHKAUF Christoph Johannes Eggers e.K.", "anschrift": "Klinkerstrasse 89", "plz": "25436", "ort": "Moorrege"}, {"ninox": "172296", "sap": "2514514", "name": "NAHKAUF ENGELBRECHT", "anschrift": "Dorfstr. 8", "plz": "25599", "ort": "Wewelsfleth"}, {"ninox": "172406", "sap": "2515314", "name": "REWE Ahmad Ahad oHG", "anschrift": "Stresemannstr.197/Kieler Str.1", "plz": "22769", "ort": "Hamburg"}, {"ninox": "172667", "sap": "2516061", "name": "EDEKA MEYERS FRISCHECENTER", "anschrift": "Peiner Hag 1", "plz": "25497", "ort": "Prisdorf"}, {"ninox": "172726", "sap": "2521035", "name": "Edeka Tamme", "anschrift": "Paul-Nevermann-Platz 15", "plz": "22765", "ort": "Hamburg"}, {"ninox": "172727", "sap": "2521017", "name": "Edeka Klein", "anschrift": "Feldstraße 90", "plz": "22880", "ort": "Wedel"}, {"ninox": "172728", "sap": "2521026", "name": "Edeka Boldt", "anschrift": "Kaiser Friedrich Ufer 30", "plz": "20253", "ort": "Hamburg"}, {"ninox": "172798", "sap": "2520834", "name": "REWE Carsten Behrens oHG", "anschrift": "Kieler Str. 55-59", "plz": "25451", "ort": "Quickborn"}, {"ninox": "172801", "sap": "2088338", "name": "Edeka Böge Handels KG", "anschrift": "Hauptstr. 39", "plz": "25462", "ort": "Rellingen"}, {"ninox": "172803", "sap": "2521178", "name": "E-Center Frauen", "anschrift": "ROTENBROOK 4", "plz": "25524", "ort": "ITZEHOE"}, {"ninox": "172804", "sap": "2521172", "name": "E-Center Frauen", "anschrift": "KAUFHAUSSTR. 1", "plz": "25541", "ort": "BRUNSBÜTTEL"}, {"ninox": "172806", "sap": "2521169", "name": "Edeka Frauen", "anschrift": "HAFENSTR. 6", "plz": "25709", "ort": "MARNE"}, {"ninox": "172807", "sap": "2521180", "name": "E-Center Frauen", "anschrift": "FRITZ-LAU-PLATZ 3-5", "plz": "25348", "ort": "GLÜCKSTADT"}, {"ninox": "172808", "sap": "2521176", "name": "Edeka Frauen", "anschrift": "KOOGSTR. 75", "plz": "25541", "ort": "BRUNSBÜTTEL"}, {"ninox": "173046", "sap": "2082611", "name": "Lebensmittel+Feinkost Sarikaya", "anschrift": "Parkallee 15", "plz": "20144", "ort": "Hamburg"}, {"ninox": "173078", "sap": "2525389", "name": "EDEKA Frischemarkt Smedje", "anschrift": "Dorfstr. 19", "plz": "25572", "ort": "Sankt Margarethen"}, {"ninox": "173149", "sap": "2525678", "name": "EDEKA HIRCHE", "anschrift": "Eimsbüttler Chaussee 17", "plz": "20259", "ort": "Hamburg"}, {"ninox": "173367", "sap": "2530205", "name": "Rossmann", "anschrift": "Jungfernstieg 38", "plz": "20354", "ort": "Hamburg"}, {"ninox": "173435", "sap": "2527417", "name": "Edeka Christian Berndt", "anschrift": "Koppelstr. 47-49", "plz": "22529", "ort": "Hamburg"}, {"ninox": "173529", "sap": "2527161", "name": "GLOBUS", "anschrift": "Grandkuhlenweg 11", "plz": "22549", "ort": "Hamburg"}, {"ninox": "173892", "sap": "2498928", "name": "Penny Thesdorfer Weg", "anschrift": "THESDORFER WEG 3", "plz": "25421", "ort": "PINNEBERG"}, {"ninox": "173912", "sap": "2498964", "name": "Penny Ulzburger Meile", "anschrift": "ULZBURGER STR. 308-310", "plz": "22846", "ort": "NORDERSTEDT"}, {"ninox": "173956", "sap": "2499038", "name": "Penny Friedensallee", "anschrift": "FRIEDENSALLEE 98", "plz": "22763", "ort": "HAMBURG"}, {"ninox": "174058", "sap": "2499224", "name": "Penny Hindenburg", "anschrift": "HINDENBURGSTR. 54", "plz": "22297", "ort": "HAMBURG"}, {"ninox": "174128", "sap": "2499353", "name": "Penny Am Marktplatz", "anschrift": "Elbgaustr./Ekenknick 9", "plz": "22523", "ort": "Hamburg/Eidelstedt"}, {"ninox": "174198", "sap": "2499514", "name": "Penny Heussweg", "anschrift": "HEUSSWEG 52-54", "plz": "20255", "ort": "HAMBURG"}, {"ninox": "174277", "sap": "2499673", "name": "Penny Kieler Str.", "anschrift": "KIELER STR. 236", "plz": "22525", "ort": "HAMBURG"}, {"ninox": "174402", "sap": "2499902", "name": "Penny Wilster", "anschrift": "MÜHLENSTR. 5", "plz": "25554", "ort": "WILSTER"}, {"ninox": "174431", "sap": "2499961", "name": "Penny Friedrich-Ebert-Str.", "anschrift": "FRIEDRICH-EBERT-STR. 2", "plz": "25421", "ort": "PINNEBERG"}, {"ninox": "174473", "sap": "2500037", "name": "Penny Schnelsen", "anschrift": "HOLSTEINER CHAUSSEE 274", "plz": "22457", "ort": "HAMBURG"}, {"ninox": "174542", "sap": "2500160", "name": "Penny U-Christuskirche", "anschrift": "SCHÄFERKAMPSALLEE 56", "plz": "20357", "ort": "HAMBURG"}, {"ninox": "174543", "sap": "2500161", "name": "Penny Erikastr.", "anschrift": "ERIKASTR. 62", "plz": "20251", "ort": "HAMBURG"}, {"ninox": "174592", "sap": "2500247", "name": "Penny Friedrich-Ebert-Allee 23", "anschrift": "FRIEDRICH-EBERT-ALLEE 23", "plz": "22869", "ort": "SCHENEFELD"}, {"ninox": "174693", "sap": "2500416", "name": "Penny Alsterdorf", "anschrift": "ALSTERDORFER STR. 63-65", "plz": "22299", "ort": "HAMBURG"}, {"ninox": "174726", "sap": "2500464", "name": "Penny St. Pauli", "anschrift": "NOBISTOR 27", "plz": "22767", "ort": "HAMBURG"}, {"ninox": "174791", "sap": "2500565", "name": "Penny Happy Town", "anschrift": "MOLENKIEKERGANG 1", "plz": "25348", "ort": "GLÜCKSTADT"}, {"ninox": "174827", "sap": "2500636", "name": "Penny Wedel", "anschrift": "BAHNHOFSTR. 50-52", "plz": "22880", "ort": "WEDEL"}, {"ninox": "175027", "sap": "2501017", "name": "Penny Am Kaifu", "anschrift": "EPPENDORFER WEG 111", "plz": "20259", "ort": "HAMBURG"}, {"ninox": "175057", "sap": "2501074", "name": "Penny An der A23", "anschrift": "LINDENSTR. 196 A", "plz": "25524", "ort": "ITZEHOE"}, {"ninox": "175067", "sap": "2501092", "name": "Penny Am Stadtzentrum", "anschrift": "ALTONAER CHAUSSEE 81-83", "plz": "22869", "ort": "SCHENEFELD"}, {"ninox": "175074", "sap": "2501104", "name": "Penny Holo", "anschrift": "BREITE STR. 4", "plz": "25551", "ort": "HOHENLOCKSTEDT"}, {"ninox": "175079", "sap": "2501109", "name": "Penny Adenauerdamm", "anschrift": "ADENAUERDAMM 77", "plz": "25337", "ort": "ELMSHORN"}, {"ninox": "175086", "sap": "2501117", "name": "Penny Niendorf", "anschrift": "NORDALBINGERWEG 11", "plz": "22455", "ort": "HAMBURG"}, {"ninox": "175087", "sap": "2501118", "name": "Penny Lurup", "anschrift": "ELBGAUSTR. 122", "plz": "22547", "ort": "HAMBURG"}, {"ninox": "175092", "sap": "2501125", "name": "Penny Tornesch", "anschrift": "OHLENHOFF 2", "plz": "25436", "ort": "TORNESCH"}, {"ninox": "175097", "sap": "2501131", "name": "Penny Kieler Straße", "anschrift": "KIELER STR. 57", "plz": "24568", "ort": "KALTENKIRCHEN"}, {"ninox": "175100", "sap": "2501134", "name": "Penny Krähenweg", "anschrift": "KRÄHENWEG 4", "plz": "22459", "ort": "HAMBURG"}, {"ninox": "175107", "sap": "2501170", "name": "Penny Am Kretelmoor", "anschrift": "AM KRETELMOOR 42", "plz": "24568", "ort": "KALTENKIRCHEN"}, {"ninox": "175110", "sap": "2501178", "name": "Penny Zentrum", "anschrift": "SCHULSTR. 9A", "plz": "24568", "ort": "KALTENKIRCHEN"}, {"ninox": "175117", "sap": "2501204", "name": "Penny Hoheluft", "anschrift": "EPPENDORFER WEG 261", "plz": "20251", "ort": "HAMBURG"}, {"ninox": "175156", "sap": "2501264", "name": "Penny Rugenbarg", "anschrift": "RUGENBARG 85-87", "plz": "22549", "ort": "HAMBURG"}, {"ninox": "175178", "sap": "2501300", "name": "Penny Eimsbüttel", "anschrift": "LANGENFELDER DAMM 29-31", "plz": "20257", "ort": "HAMBURG"}, {"ninox": "175205", "sap": "2501387", "name": "Penny Osdorf", "anschrift": "OSDORFER LANDSTR. 118", "plz": "22549", "ort": "HAMBURG"}, {"ninox": "175223", "sap": "2501480", "name": "Penny Quellental", "anschrift": "RICHARD-KÖHN-STR. 2", "plz": "25421", "ort": "PINNEBERG"}, {"ninox": "175234", "sap": "2501509", "name": "Penny Garten Eden", "anschrift": "EDENDORFER STR. 72", "plz": "25524", "ort": "ITZEHOE"}, {"ninox": "175245", "sap": "2501542", "name": "Penny Troplo", "anschrift": "TROPLOWITZSTR. 7", "plz": "22529", "ort": "HAMBURG"}, {"ninox": "175257", "sap": "2501592", "name": "Penny Uetersen", "anschrift": "LIENAUS ALLEE 2", "plz": "25436", "ort": "UETERSEN"}, {"ninox": "175258", "sap": "2501594", "name": "Penny Köllner Chaussee", "anschrift": "KÖLLNER CHAUSSEE 68", "plz": "25337", "ort": "ELMSHORN"}, {"ninox": "175307", "sap": "2501710", "name": "Penny Rissen", "anschrift": "RISSENER DORFSTR. 51", "plz": "22559", "ort": "HAMBURG"}, {"ninox": "175681", "sap": "2502829", "name": "Penny Ackerviertel", "anschrift": "PINNEBERGER CHAUSSEE 114", "plz": "22523", "ort": "HAMBURG"}, {"ninox": "175690", "sap": "2502851", "name": "Penny Paaschburg", "anschrift": "GROSSE PAASCHBURG 43-47", "plz": "25524", "ort": "ITZEHOE"}, {"ninox": "175853", "sap": "2530381", "name": "Penny", "anschrift": "Küsterkamp 5", "plz": "25355", "ort": "Barmstedt"}, {"ninox": "175879", "sap": "2530469", "name": "Penny", "anschrift": "Schulterblatt 49", "plz": "20357", "ort": "Hamburg"}, {"ninox": "176083", "sap": "2533048", "name": "EDEKA MEYERS FRISCHECENTER", "anschrift": "Friedrich-Ebert-Straße 38-42", "plz": "25421", "ort": "Pinneberg"}, {"ninox": "176099", "sap": "2533112", "name": "Edeka Meyers Frischecenter", "anschrift": "Saarlandstraße 65", "plz": "25421", "ort": "Pinneberg"}, {"ninox": "191853", "sap": "2544573", "name": "REWE Jörg Kühne oHG", "anschrift": "Landweg 17-21", "plz": "24576", "ort": "Bad Bramstedt"}, {"ninox": "192055", "sap": "2539411", "name": "Edeka Jensen e.K.", "anschrift": "Gerberstraße 3", "plz": "25436", "ort": "Uetersen"}, {"ninox": "192068", "sap": "2546634", "name": "Frischemarkt Jurgeleit e.K.", "anschrift": "Sophie-Rahel-Jansen-Straße 100", "plz": "22609", "ort": "Hamburg"}, {"ninox": "192165", "sap": "2547406", "name": "Netto Marken-Discount", "anschrift": "Emil-von-Behring-Straße", "plz": "25541", "ort": "Brunsbüttel"}, {"ninox": "192243", "sap": "2547272", "name": "Getränke Hoffmann Knob", "anschrift": "Frohmestr. 102-106", "plz": "22459", "ort": "Hamburg"}, {"ninox": "192263", "sap": "2547051", "name": "Getränke Hoffmann Zander", "anschrift": "Hamburger Str. 46", "plz": "24576", "ort": "Bad Bramstedt"}, {"ninox": "192266", "sap": "2547222", "name": "Getränke Hoffmann Youssef", "anschrift": "Hamburger Str. 22", "plz": "24568", "ort": "Kaltenkirchen"}, {"ninox": "192308", "sap": "2547157", "name": "Getränke Hoffmann", "anschrift": "Güttloh 1-5", "plz": "25451", "ort": "Quickborn"}, {"ninox": "192322", "sap": "2547210", "name": "Getränke Hoffmann Holm", "anschrift": "Schenefelder Chaussee 80", "plz": "25524", "ort": "Itzehoe"}, {"ninox": "192329", "sap": "2547072", "name": "Getränke Hoffmann Rieper", "anschrift": "Hauptstr. 105", "plz": "25462", "ort": "Rellingen"}, {"ninox": "192336", "sap": "2547055", "name": "Getränke Hoffmann Hysenaj", "anschrift": "Hindenburgstr. 173", "plz": "22297", "ort": "Hamburg"}, {"ninox": "192375", "sap": "2547052", "name": "Getränke Hoffmann Hermann", "anschrift": "Elmshorner Str. 181-189", "plz": "25421", "ort": "Pinneberg"}, {"ninox": "192438", "sap": "2547362", "name": "Getränke Hoffmann Schmielau", "anschrift": "Rolandstr. 25", "plz": "22880", "ort": "Wedel"}, {"ninox": "192467", "sap": "2547295", "name": "Getränke Hoffmann Hermann", "anschrift": "Ohlenhoff 4", "plz": "25436", "ort": "Tornesch"}, {"ninox": "192481", "sap": "2547343", "name": "Getränke Hoffmann Plath", "anschrift": "Königstr. 63", "plz": "25709", "ort": "Marne"}, {"ninox": "192619", "sap": "2547993", "name": "Edeka Anders e.K.", "anschrift": "Grindelallee 126", "plz": "20146", "ort": "Hamburg"}, {"ninox": "192944", "sap": "2551150", "name": "REWE Philipp Menz oHG", "anschrift": "Grindelallee 40-44", "plz": "20146", "ort": "Hamburg"}, {"ninox": "192947", "sap": "2551146", "name": "REWE Ahmad Ahad oHG", "anschrift": "Eppendorfer Landstr. 77", "plz": "20249", "ort": "Hamburg"}, {"ninox": "192966", "sap": "2551181", "name": "REWE Getränkemarkt", "anschrift": "Wedeler Chaussee 43b", "plz": "25436", "ort": "Moorrege"}, {"ninox": "192967", "sap": "2551192", "name": "REWE", "anschrift": "Kamper Weg 92", "plz": "25524", "ort": "Itzehoe"}, {"ninox": "197876", "sap": "2560969", "name": "Frischemarkt Sükmen", "anschrift": "Brahmsallee 32", "plz": "20144", "ort": "Hamburg"}, {"ninox": "197979", "sap": "2560968", "name": "REWE Carsten Krage oHG", "anschrift": "Hamburger Str. 53-59", "plz": "24568", "ort": "Kaltenkirchen"}, {"ninox": "197982", "sap": "2561308", "name": "Rewe Nicole Strunskus ohG", "anschrift": "Johannßenstr. 17", "plz": "25693", "ort": "St. Michaelisdonn"}, {"ninox": "198038", "sap": "2561316", "name": "Nahkauf Nouri", "anschrift": "Harksheiderweg 107", "plz": "25451", "ort": "Quickborn"}, {"ninox": "198073", "sap": "2562072", "name": "Rewe Denis Poellath oHG", "anschrift": "Lise-Meitner-Str. 16", "plz": "25524", "ort": "Itzehoe"}, {"ninox": "198196", "sap": "2564167", "name": "Edeka Beese Frischmarkt e.K.", "anschrift": "Tibarg 44-48", "plz": "22459", "ort": "Hamburg"}, {"ninox": "198347", "sap": "2564165", "name": "Edeka Radtke e.K.", "anschrift": "Ulzburger Str. 585", "plz": "22844", "ort": "Norderstedt"}, {"ninox": "198503", "sap": "2565610", "name": "Edeka Am Lüttensee", "anschrift": "Ohlenhoff 3", "plz": "25436", "ort": "Tornesch"}, {"ninox": "198521", "sap": "2565596", "name": "Rewe Carsten Krage oHG GM", "anschrift": "Flottkamp 22 - 26", "plz": "24568", "ort": "Kaltenkirchen"}, {"ninox": "198522", "sap": "2565934", "name": "Rewe Carsten Krage oHG", "anschrift": "Flottkamp 22 - 26", "plz": "24568", "ort": "Kaltenkirchen"}, {"ninox": "198546", "sap": "2565958", "name": "Edeka André Bandelt e.K.", "anschrift": "Elbgaustr. 118a", "plz": "22547", "ort": "Hamburg"}, {"ninox": "198558", "sap": "2565941", "name": "Edeka Regie", "anschrift": "Winterhuder Marktplatz 18", "plz": "22299", "ort": "Hamburg"}, {"ninox": "198579", "sap": "2565921", "name": "Edeka Henning e.K.", "anschrift": "Jarrestraße 2-6", "plz": "22303", "ort": "Hamburg"}, {"ninox": "198582", "sap": "2566765", "name": "Edeka Pigarew e.K.", "anschrift": "Borsteler Chaussee 136 - 138", "plz": "22453", "ort": "Hamburg"}, {"ninox": "198947", "sap": "2571360", "name": "Edeka Patrick Gehrke e.K.", "anschrift": "Bahnhofsstr. 102", "plz": "25451", "ort": "Quickborn"}, {"ninox": "199033", "sap": "2571367", "name": "Edeka Yvonne Hebig e.K.", "anschrift": "Rathausallee 35 - 39", "plz": "22846", "ort": "Norderstedt"}, {"ninox": "199084", "sap": "2571117", "name": "Famila", "anschrift": "Vor dem Delftor 10", "plz": "25524", "ort": "Itzehoe"}];



// Hamburger menu
(function(){
  const btn = document.getElementById("menuBtn");
  const panel = document.getElementById("menuPanel");
  if(!btn || !panel) return;
  const close = ()=>{ panel.classList.remove("open"); panel.setAttribute("aria-hidden","true"); };
  const toggle = ()=>{
    const open = panel.classList.toggle("open");
    panel.setAttribute("aria-hidden", open ? "false" : "true");
  };
  btn.addEventListener("click", (e)=>{ e.stopPropagation(); toggle(); });
  panel.addEventListener("click",(e)=>{ e.stopPropagation(); });
  document.addEventListener("click", close);
  document.addEventListener("keydown", (e)=>{ if(e.key==="Escape") close(); });
})();


// Share (AirDrop / iOS Share Sheet via Web Share API)
(function(){
  const btn = document.getElementById("shareBtn");
  if(!btn) return;

  function buildShareText(){
    const ordered = routeIds
      .map(id=>markets.find(m=>m.id===id))
      .filter(Boolean);

    if(!ordered.length) return "Noch keine Route geplant.";
    return ordered.map((m,i)=>{
      const addr = marketAddr(m);
      const sap = m.sap ? ` (SAP ${m.sap})` : "";
      return `${i+1}. ${m.name}${sap}${addr?` – ${addr}`:""}`;
    }).join("\n");
  }

  function buildShareFile(){
    const ordered = routeIds
      .map(id=>markets.find(m=>m.id===id))
      .filter(Boolean)
      .map(m=>({
        id: m.id,
        name: m.name,
        sap: m.sap || "",
        anschrift: m.anschrift || "",
        plz: m.plz || "",
        ort: m.ort || "",
        lat: m.lat ?? null,
        lng: m.lng ?? null,
      }));

    const payload = {
      app: "SELLENCE-TOURENPLANER",
      createdAt: new Date().toISOString(),
      route: ordered
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {type:"application/json"});
    return new File([blob], "sellence-tourenplan.json", {type:"application/json"});
  }

  async function copy(text){
    try{
      await navigator.clipboard.writeText(text);
      alert("Link kopiert ✅");
    }catch(e){
      prompt("Kopieren:", text);
    }
  }

  btn.addEventListener("click", async ()=>{
    const url = location.href;
    const title = "SELLENCE Tourenplaner – Route";
    const text = buildShareText();

    // Prefer sharing a small JSON export too (works great with AirDrop into Files/Notes/WhatsApp)
    const file = buildShareFile();
    const payloadWithFile = { title, text, url, files:[file] };
    const payloadNoFile = { title, text, url };

    if(navigator.share){
      try{
        if(navigator.canShare && navigator.canShare({files:[file]})){
          await navigator.share(payloadWithFile);
        }else{
          await navigator.share(payloadNoFile);
        }
      }catch(err){
        // user canceled or share failed – silently ignore
        console.warn(err);
      }
      return;
    }

    // Fallback: copy link
    await copy(url);
  });
})();


// Add-market modal helpers
function setAddMarketStatus(msg=""){
  const el = document.getElementById("addMarketStatus");
  if(!el) return;
  el.textContent = msg;
  el.classList.toggle("show", !!msg);
}
function openAddMarketModal(){
  const modal = document.getElementById("addMarketModal");
  if(!modal) return;
  modal.classList.add("open");
  modal.setAttribute("aria-hidden","false");
  setAddMarketStatus("");
  (document.getElementById("amName"))?.focus();
}
function closeAddMarketModal(){
  const modal = document.getElementById("addMarketModal");
  if(!modal) return;
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden","true");
  setAddMarketStatus("");
}

// Wire modal UI
(function(){
  const btnOpen = document.getElementById("btnAddMarket");
  const modal = document.getElementById("addMarketModal");
  if(btnOpen && modal){
    btnOpen.addEventListener("click", ()=>{
      // close hamburger menu if open
      document.getElementById("menuPanel")?.classList.remove("open");
      document.getElementById("menuPanel")?.setAttribute("aria-hidden","true");
      // reset fields
      (document.getElementById("amName")).value = "";
      (document.getElementById("amAddr")).value = "";
      (document.getElementById("amSap")).value = "";
      openAddMarketModal();
    });
  }

  document.getElementById("btnAddMarketClose")?.addEventListener("click", closeAddMarketModal);
  document.getElementById("btnAddMarketCancel")?.addEventListener("click", closeAddMarketModal);
  modal?.addEventListener("click", (e)=>{ if(e.target === modal) closeAddMarketModal(); });
  document.addEventListener("keydown", (e)=>{ if(e.key === "Escape") closeAddMarketModal(); });
})();

function load(key, fallback){
  try{ const raw=localStorage.getItem(key); return raw?JSON.parse(raw):fallback; }catch{return fallback;}
}
function save(key, val){ localStorage.setItem(key, JSON.stringify(val)); }
function uid(){ return (crypto?.randomUUID?.() || ("id_"+Math.random().toString(16).slice(2)+Date.now())); }
function toNum(v){ const n=parseFloat(String(v??"").replace(",", ".")); return Number.isFinite(n)?n:null; }
function isNum(n){ return Number.isFinite(n); }
function escapeHTML(s){ return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c])); }
function formatKm(km){ return Number.isFinite(km)?km.toFixed(1).replace(".", ","):"—"; }
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

function setTourGateVisible(on){
  const gate = document.getElementById("tourGate");
  if(!gate) return;
  gate.classList.toggle("hidden", !on);
}
function setUiLocked(on){
  // lock buttons that should not be usable while auto-geotagging runs
  const ids = [
    "menuBtn","btnAddMarket","btnImport","btnGeocode","btnFahrdaten","btnClearAll",
    "btnFind","btnFit","sapSearch",
    "btnFinalize","btnStartMaps","btnResetRoute","chkReturn"
  ];
  for(const id of ids){
    const el = document.getElementById(id);
    if(!el) continue;
    el.disabled = !!on;
  }
}

let __geoStopRequested = false;
function showGeoPanel(show){
  const p = document.getElementById("geoPanel");
  if(!p) return;
  p.hidden = !show;
}
function updateGeoStatus({title, text, progress01}){
  const t = document.getElementById("geoTitle");
  const x = document.getElementById("geoText");
  const fill = document.getElementById("geoBarFill");
  if(t && title != null) t.textContent = title;
  if(x && text != null) x.textContent = text;
  if(fill && typeof progress01 === "number"){
    const pct = Math.max(0, Math.min(1, progress01)) * 100;
    fill.style.width = pct.toFixed(1) + "%";
  }
}

async function runGeocoding({auto=false, lock=true, loop=false} = {}){
  if(!markets.length) return;
  __geoStopRequested = false;
  showGeoPanel(true);
  if(lock) setUiLocked(true);

  // We retry until either everything is tagged, or user presses stop.
  let pass = 0;
  while(true){
    pass++;
    const missing = markets.filter(m=>!(isNum(m.lat)&&isNum(m.lng)));
    if(!missing.length){
      updateGeoStatus({title:"✅ Geotagging fertig", text:`Alle Märkte sind geotaggt.`, progress01:1});
      break;
    }
    updateGeoStatus({title:"🧭 Geotagging läuft…", text:`Fehlend: ${missing.length} Märkte (Pass ${pass})`, progress01:0});
    let found=0;
    for(let i=0;i<missing.length;i++){
      if(__geoStopRequested) break;
      const m=missing[i];
      const q1 = `${marketAddr(m)}, Deutschland`;
      const q2 = `${m.anschrift||""}, ${m.plz||""} ${m.ort||""}, Deutschland`;
      let geo = await nominatimGeocode(q1);
      if(!geo) geo = await nominatimGeocode(q2);
      if(geo){ m.lat=geo.lat; m.lng=geo.lng; found++; save(STORE.markets, markets); }
      if((i+1)%10===0) renderMarkers();
      const done = i+1;
      const total = missing.length;
      updateGeoStatus({
        title:"🧭 Geotagging läuft…",
        text:`${done}/${total} • Gefunden: ${found} • Aktuell: ${m.name||"Markt"} (${m.sap||"—"})`,
        progress01: total ? (done/total) : 0
      });
      await sleep(1100);
    }
    save(STORE.markets, markets);
    renderMarkers();
    fitAll();

    if(__geoStopRequested){
      updateGeoStatus({title:"⏸️ Geotagging pausiert", text:"Abgebrochen. Du kannst jederzeit erneut starten.", progress01:0});
      break;
    }

    const stillMissing = markets.filter(m=>!(isNum(m.lat)&&isNum(m.lng))).length;
    if(!stillMissing){
      updateGeoStatus({title:"✅ Geotagging fertig", text:`Gefunden in Pass ${pass}.`, progress01:1});
      break;
    }
    updateGeoStatus({title:"⚠️ Nicht alle gefunden", text:`Noch fehlend: ${stillMissing}. ${loop ? "Neuer Versuch startet gleich…" : "Bitte erneut starten."}`, progress01:0});
    if(!loop) break;
    await sleep(2500);
  }

  if(lock) setUiLocked(false);
  // keep panel visible for a moment in auto mode
  if(auto){
    await sleep(800);
  }
}

function setupGate(){
  const gate = document.getElementById("tourGate");
  const input = document.getElementById("tourPass");
  const btn = document.getElementById("btnUnlock");
  const hint = document.getElementById("authHint");

  if(!gate || !input || !btn) return;

  // Pre-fill with last used account password for convenience (Franco-friendly)
  const last = localStorage.getItem("sellence_tour_account_v1") || "sellence";
  input.value = (last === "franco") ? "franco" : "sellence";

  const applyVisibility = ()=>{
    setTourGateVisible(!isUnlocked());
  };
  applyVisibility();

  btn.addEventListener("click", ()=>{
    const val = (input.value || "").trim().toLowerCase();
    let acc = null;
    if(val === AUTH_PASSWORDS.sellence) acc = "sellence";
    if(val === AUTH_PASSWORDS.franco) acc = "franco";
    if(!acc){
      if(hint) hint.textContent = "Falsches Passwort. Bitte 'sellence' oder 'franco' eingeben.";
      input.focus();
      input.select();
      return;
    }
    localStorage.setItem("sellence_tour_account_v1", acc);
    sessionStorage.setItem(SESSION_UNLOCK_KEY, "1");
    // reload so the correct storage keys + filters are applied cleanly
    location.reload();
  });
}


let markets = load(STORE.markets, []);
let routeIds = load(STORE.route, []);
let myPos = load(STORE.myPos, null); // {lat,lng}
let lastLinks = load(STORE.lastLinks, []);

function setStartEnabled(on){
  const b = document.getElementById("btnStartMaps");
  if(!b) return;
  b.disabled = !on;
}

function setStatus(msg=""){
  const el = document.getElementById("status");
  if(!el) return;
  el.textContent = msg;
  el.classList.toggle("show", !!msg);
}

// "So funktioniert's" collapse
(function(){
  const btn = document.getElementById("btnHow");
  const panel = document.getElementById("howPanel");
  if(!btn || !panel) return;
  const sync = ()=>{ btn.textContent = panel.hidden ? "So funktioniert’s" : "So funktioniert’s ausblenden"; };
  btn.addEventListener("click", ()=>{ panel.hidden = !panel.hidden; sync(); });
  sync();
})();

// Return-to-start checkbox hint
(function(){
  const chk = document.getElementById("chkReturn");
  const hint = document.getElementById("returnHint");
  if(!chk || !hint) return;
  const sync = ()=>{
    hint.style.display = chk.checked ? "block" : "none";
  };
  chk.addEventListener("change", sync);
  sync();
})();

function marketAddr(m){
  const parts=[];
  if(m.anschrift) parts.push(m.anschrift.trim());
  const line2=[m.plz, m.ort].filter(Boolean).join(" ").trim();
  if(line2) parts.push(line2);
  return parts.join(", ");
}

function normalizeHeader(h){
  return String(h||"").trim().replace(/\s+/g," ").replace(/\u00A0/g," ").toLowerCase();
}

function extractFromRow(row){
  const keys=Object.keys(row);
  const pick=(alts)=>{
    const k=keys.find(k0=>alts.includes(normalizeHeader(k0)));
    return k?row[k]:null;
  };
  const sap = pick(["sap-nr.","sap-nr", "sap nr.", "sap nr", "sap"]);
  const name = pick(["name des händlers", "händlername", "name"]);
  const anschrift = pick(["anschrift", "straße", "strasse"]);
  const plz = pick(["plz"]);
  const ort = pick(["ort"]);
  const ninox = pick(["ninox-id","ninox id"]);
  const lat = toNum(pick(["lat","latitude","breite"]));
  const lng = toNum(pick(["lng","lon","longitude","länge","laenge"]));
  if(!sap && !name) return null;
  return {
    id: uid(),
    sap: String(sap??"").trim(),
    ninox: String(ninox??"").trim(),
    name: String(name??"").trim(),
    anschrift: String(anschrift??"").trim(),
    plz: String(plz??"").trim(),
    ort: String(ort??"").trim(),
    lat: isNum(lat)?lat:null,
    lng: isNum(lng)?lng:null
  };
}

function mergeMarkets(imported){
  const bySap=new Map(markets.filter(m=>m.sap).map(m=>[m.sap,m]));
  const byKey=new Map(markets.map(m=>[(`${m.name}|${marketAddr(m)}`).toLowerCase(),m]));
  let added=0, updated=0;
  for(const m of imported){
    const existing = (m.sap && bySap.get(m.sap)) || byKey.get((`${m.name}|${marketAddr(m)}`).toLowerCase());
    if(existing){
      existing.ninox = m.ninox || existing.ninox;
      existing.name = m.name || existing.name;
      existing.anschrift = m.anschrift || existing.anschrift;
      existing.plz = m.plz || existing.plz;
      existing.ort = m.ort || existing.ort;
      if(!isNum(existing.lat) && isNum(m.lat)) existing.lat=m.lat;
      if(!isNum(existing.lng) && isNum(m.lng)) existing.lng=m.lng;
      updated++;
    } else {
      markets.push(m);
      added++;
    }
  }
  save(STORE.markets, markets);
  return {added, updated};
}

// ---------- Map (Leaflet) ----------
let map=null, layer=null, myMarker=null, routeLine=null;

function initMap(){
  if(map) return;
  map = L.map("map",{zoomControl:true, preferCanvas:true}).setView([54.78, 9.43], 9);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19, attribution:"&copy; OpenStreetMap"}).addTo(map);
  layer = L.layerGroup().addTo(map);
  renderMarkers();
}

function setMyMarker(){
  if(!map || !myPos) return;
  if(myMarker) myMarker.setLatLng([myPos.lat,myPos.lng]);
  else{
    myMarker = L.circleMarker([myPos.lat,myPos.lng],{radius:10,weight:2,color:"#1E8BFF",fillColor:"#1E8BFF",fillOpacity:0.9}).addTo(map);
    myMarker.bindPopup("<b>Du bist hier</b>");
  }
}

function clearRouteLine(){
  if(routeLine){ routeLine.remove(); routeLine=null; }
}
function deleteMarket(id){
  const m = markets.find(x=>x.id===id);
  if(!m) return;
  // remove from route as well
  routeIds = routeIds.filter(x=>x!==id);
  markets = markets.filter(x=>x.id!==id);
  save(STORE.markets, markets);
  save(STORE.route, routeIds);
  // invalidate previous Google Maps links
  lastLinks = [];
  save(STORE.lastLinks, lastLinks);
  clearRouteLine();
  renderRoute();
  renderMarkers();
  setStartEnabled(false);
  try{ map?.closePopup(); }catch(e){}
}

function attachLongPressDelete(marker, market){
  let t = null;
  let fired = false;
  const start = ()=>{
    fired = false;
    clearTimeout(t);
    t = setTimeout(()=>{
      fired = true;
      const name = market.name || 'Markt';
      if(confirm(`${name}\n\nDauerhaft loeschen?`)){
        deleteMarket(market.id);
      }
    }, 650);
  };
  const cancel = ()=>{
    clearTimeout(t);
    t = null;
  };

  // Mobile/PWA: long press usually triggers 'contextmenu' too
  marker.on('contextmenu', ()=>{
    const name = market.name || 'Markt';
    if(confirm(`${name}\n\nDauerhaft loeschen?`)){
      deleteMarket(market.id);
    }
  });

  marker.on('mousedown', start);
  marker.on('touchstart', start);
  marker.on('mouseup', cancel);
  marker.on('touchend', cancel);
  marker.on('mouseout', cancel);
  marker.on('touchcancel', cancel);
  marker.on('mousemove', ()=>{ if(t && !fired){} });
}


function renderMarkers(highlightId=null){
  if(!layer) return;
  layer.clearLayers();
  const pts = markets.filter(m=>isNum(m.lat)&&isNum(m.lng));
  pts.forEach(m=>{
    const inRoute = routeIds.includes(m.id);
    const isHi = highlightId && m.id===highlightId;
    const color = isHi ? "#FFD250" : (inRoute ? "#31E7A6" : "rgba(255,255,255,.82)");
    const fill = isHi ? "#FFD250" : (inRoute ? "#31E7A6" : "#5B2EFF");
    const marker=L.circleMarker([m.lat,m.lng],{radius:isHi?11:9,weight:2,opacity:1,fillOpacity:0.85,color,fillColor:fill}).addTo(layer);
    attachLongPressDelete(marker, m);
    const addr = marketAddr(m);
    const popup=document.createElement("div");
    popup.className = "popupCard";
    popup.innerHTML=`
      <div class="popupTitle">${escapeHTML(m.name||"")}</div>
      <div class="popupAddr">${escapeHTML(addr)}</div>
      <div class="popupMeta"><b>SAP:</b> ${escapeHTML(m.sap||"—")}</div>
      <div class="popupActions">
        <button class="btn primary" id="add_${m.id}" style="padding:8px 10px;border-radius:12px">${inRoute?"In Route ✓":"In Route +"}</button>
        <a class="btn" style="padding:8px 10px;border-radius:12px;text-decoration:none" target="_blank" rel="noreferrer"
           href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}">Google</a>
      </div>`;
    marker.bindPopup(popup);
    marker.on("popupopen", ()=>{
      setTimeout(()=>{
        popup.querySelector(`#add_${CSS.escape(m.id)}`)?.addEventListener("click", ()=>{
          toggleRoute(m.id);
          renderRoute();
          renderMarkers(m.id);
        });
      },0);
    });
  });
  setMyMarker();
}

function fitAll(){
  if(!map) return;
  const pts = markets.filter(m=>isNum(m.lat)&&isNum(m.lng));
  if(!pts.length){ map.setView([54.78, 9.43], 9); return; }
  const bounds = L.latLngBounds(pts.map(m=>[m.lat,m.lng]));
  if(myPos) bounds.extend([myPos.lat,myPos.lng]);
  map.fitBounds(bounds.pad(0.2));
}

// ---------- Route ----------
function toggleRoute(id){
  if(routeIds.includes(id)) routeIds = routeIds.filter(x=>x!==id);
  else routeIds.push(id);
  save(STORE.route, routeIds);
  // Any change invalidates previous Google Maps links
  lastLinks = [];
  save(STORE.lastLinks, lastLinks);
  setStartEnabled(false);
  clearRouteLine();
}

function routePoints(){
  return routeIds.map(id=>markets.find(m=>m.id===id)).filter(Boolean);
}

function renderRoute(km=null){
  const pts=routePoints();
  $("kStops").textContent=String(pts.length);
  $("kKm").textContent = km!==null ? formatKm(km) : "—";
  $("routeList").innerHTML = pts.map((m,idx)=>{
    const hasGeo=isNum(m.lat)&&isNum(m.lng);
    return `<div class="item">
      <div class="meta">
        <div class="title">${idx+1}. ${escapeHTML(m.name||"")}</div>
        <div class="sub">${escapeHTML(marketAddr(m))}</div>
        <div class="badges">
          <span class="badge">${escapeHTML(m.sap||"SAP?")}</span>
          <span class="badge ${hasGeo?"ok":"warn"}">${hasGeo?"Geo ✓":"Geo fehlt"}</span>
        </div>
      </div>
      <div class="actions-mini">
        <button class="btn danger" data-del="${m.id}">Entfernen</button>
      </div>
    </div>`;
  }).join("") || `<div class="muted tiny">Noch keine Stops. SAP suchen → Marker anklicken → „In Route +“.</div>`;

  $("routeList").querySelectorAll("button[data-del]").forEach(b=>{
    b.addEventListener("click", ()=>{
      const id=b.dataset.del;
      routeIds=routeIds.filter(x=>x!==id);
      save(STORE.route, routeIds);
      clearRouteLine();
      renderRoute();
      renderMarkers();
    });
  });
}

// ---------- Search ----------
function findBySAP(sap){
  const s=String(sap||"").trim();
  if(!s) return null;
  return markets.find(m=>String(m.sap||"").trim()===s) || null;
}
$("btnFind").addEventListener("click", ()=>{
  const m=findBySAP($("sapSearch").value);
  if(!m){ alert("SAP-Nr. nicht gefunden."); return; }
  if(isNum(m.lat)&&isNum(m.lng)){
    map.setView([m.lat,m.lng], Math.max(map.getZoom(), 14));
    renderMarkers(m.id);
  } else {
    if(confirm(`Markt gefunden:\n${m.name}\n${marketAddr(m)}\n\nIn Route aufnehmen?`)){
      toggleRoute(m.id);
      renderRoute();
      renderMarkers();
    }
  }
});
$("sapSearch").addEventListener("keydown",(e)=>{ if(e.key==="Enter"){ e.preventDefault(); $("btnFind").click(); } });
$("btnFit").addEventListener("click", ()=>fitAll());

// ---------- Import Excel ----------
$("btnImport").addEventListener("click", ()=>$("fileInput").click());
$("fileInput").addEventListener("change", async (e)=>{
  const file=e.target.files?.[0];
  if(!file) return;
  try{
    const data=await file.arrayBuffer();
    const wb=XLSX.read(data,{type:"array"});
    const sheetName=wb.SheetNames[0];
    const ws=wb.Sheets[sheetName];
    const rows=XLSX.utils.sheet_to_json(ws,{defval:""});
    const imported=[];
    for(const r of rows){
      const m=extractFromRow(r);
      if(!m || !(m.sap || m.name)) continue;

      // Regel: Bestimmte Märkte ignorieren
      const hay = `${m.name} ${m.anschrift} ${m.ort}`.toLowerCase();
      if(IGNORE_MARKETS.some(x => hay.includes(x))) continue;

      imported.push(m);
    }
    if(!imported.length){ alert("Keine passenden Zeilen gefunden."); return; }
    const res=mergeMarkets(imported);
    $("marketCount").textContent=String(markets.length);
    initMap();
    clearRouteLine();
    renderRoute();
    renderMarkers();
    fitAll();
    setStatus("Import fertig. 🧭 Geotagging startet automatisch…");
    await runGeocoding({auto:true, lock:true, loop:false});
    alert(`Import + Geotagging fertig.
Neu: ${res.added}
Aktualisiert: ${res.updated}
Gesamt: ${markets.length}`);
    setStatus("");
    } catch(err){
    console.error(err);
    alert("Import fehlgeschlagen. Bitte prüfe die Datei.");
  } finally { e.target.value=""; }
});

// ---------- Clear all ----------
$("btnClearAll").addEventListener("click", ()=>{
  if(!confirm("Wirklich ALLES löschen? (Märkte, Koordinaten, Route)")) return;
  markets=[]; routeIds=[]; myPos=null;
  lastLinks=[];
  localStorage.removeItem(STORE.markets);
  localStorage.removeItem(STORE.route);
  localStorage.removeItem(STORE.myPos);
  localStorage.removeItem(STORE.lastLinks);
  $("marketCount").textContent="0";
  clearRouteLine();
  renderRoute();
  renderMarkers();
  setStartEnabled(false);
  alert("Gelöscht.");
});

async function getMyPosIfPossible(){
  if(!navigator.geolocation) return null;
  return new Promise((resolve)=>{
    navigator.geolocation.getCurrentPosition(
      (pos)=>{
        const p={lat:pos.coords.latitude, lng:pos.coords.longitude};
        resolve(p);
      },
      ()=>resolve(null),
      {enableHighAccuracy:true, timeout:10000}
    );
  });
}

// ---------- Geocoding (Nominatim) ----------
async function nominatimGeocode(q){
  const url = `${NOMINATIM}?format=json&limit=1&addressdetails=0&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, {headers:{"Accept":"application/json"}});
  if(!res.ok) return null;
  const js = await res.json();
  if(!js?.length) return null;
  const lat=toNum(js[0].lat), lng=toNum(js[0].lon);
  if(!isNum(lat)||!isNum(lng)) return null;
  return {lat,lng};
}

// ---------- Add market (manual) ----------
function parseAddrForFields(addrInput){
  const raw = String(addrInput||"").trim();
  if(!raw) return {anschrift:"", plz:"", ort:""};
  // Try: "Street 1, 12345 City" or "Street 1 12345 City"
  let anschrift = raw;
  let plz = "", ort = "";
  const parts = raw.split(",").map(s=>s.trim()).filter(Boolean);
  if(parts.length>=2){
    anschrift = parts[0];
    const rest = parts.slice(1).join(" ").trim();
    const m = rest.match(/\b(\d{5})\s+(.+)$/);
    if(m){ plz = m[1]; ort = m[2].trim(); }
    else ort = rest;
    return {anschrift, plz, ort};
  }
  const m = raw.match(/^(.*)\b(\d{5})\s+(.+)$/);
  if(m){
    anschrift = m[1].trim().replace(/,\s*$/," ").trim();
    plz = m[2];
    ort = m[3].trim();
  }
  return {anschrift, plz, ort};
}

document.getElementById("btnAddMarketSave")?.addEventListener("click", async ()=>{
  const name = String(document.getElementById("amName")?.value||"").trim();
  const addr = String(document.getElementById("amAddr")?.value||"").trim();
  const sap = String(document.getElementById("amSap")?.value||"").trim();

  if(!name || !addr || !sap){
    setAddMarketStatus("Bitte Marktname, Adresse und SAP‑Nummer ausfüllen.");
    return;
  }
  const hay = `${name} ${addr}`.toLowerCase();
  if(IGNORE_MARKETS.some(x => hay.includes(x))){
    setAddMarketStatus("Diese Märkte werden automatisch ignoriert: Rossmann, Aldi, Lidl, Netto, Penny.");
    return;
  }

  setAddMarketStatus("Speichere & geocode …");
  const {anschrift, plz, ort} = parseAddrForFields(addr);

  // Update existing by SAP if present, else create new
  let m = markets.find(x=>String(x.sap||"").trim() === sap);
  if(!m){
    m = { id: uid(), sap, ninox:"", name, anschrift, plz, ort, lat:null, lng:null };
    markets.push(m);
  } else {
    m.name = name;
    m.anschrift = anschrift;
    m.plz = plz;
    m.ort = ort;
    m.lat = null;
    m.lng = null;
  }

  try{
    const geo = await nominatimGeocode(`${addr}, Deutschland`);
    if(geo){ m.lat = geo.lat; m.lng = geo.lng; }
    save(STORE.markets, markets);
    document.getElementById("marketCount").textContent = String(markets.length);
    initMap();
    renderMarkers(m.id);
    fitAll();
    setAddMarketStatus(geo ? "Gespeichert ✓" : "Gespeichert – Geo nicht gefunden (bitte Adresse prüfen)." );
    // close after a short, subtle delay
    setTimeout(closeAddMarketModal, 550);
  } catch(err){
    console.error(err);
    setAddMarketStatus("Speichern fehlgeschlagen. Bitte erneut versuchen.");
  }
});

$("btnGeocode").addEventListener("click", async ()=>{
  if(!markets.length){ alert("Bitte erst Excel importieren."); return; }
  const missing = markets.filter(m=>!(isNum(m.lat)&&isNum(m.lng)));
  if(!missing.length){ alert("Alle Märkte haben schon Koordinaten."); return; }
  const ok=confirm(`Es fehlen Koordinaten bei ${missing.length} Märkten.\nGeotagging startet jetzt automatisch.\nWeiter?`);
  if(!ok) return;
  await runGeocoding({auto:false, lock:true, loop:false});
});

const __geoStopBtn = document.getElementById("btnGeoStop");
if(__geoStopBtn){ __geoStopBtn.addEventListener("click", ()=>{ __geoStopRequested = true; }); }

// ---------- OSRM Optimize ----------
function coordStr(lat,lng){ return `${lng.toFixed(6)},${lat.toFixed(6)}`; } // OSRM expects lon,lat

async function osrmTrip(coords, sourceFirst=true, roundtrip=false){
  const coordPart = coords.map(c=>coordStr(c.lat,c.lng)).join(";");
  const url = `${OSRM_BASE}/trip/v1/driving/${coordPart}?source=${sourceFirst?"first":"any"}&roundtrip=${roundtrip?"true":"false"}&overview=full&geometries=geojson&steps=false&annotations=false`;
  const res = await fetch(url);
  if(!res.ok) throw new Error("OSRM HTTP "+res.status);
  const js = await res.json();
  if(js.code !== "Ok") throw new Error(js.code || "OSRM error");
  return js;
}

function drawGeoJsonLine(geo){
  clearRouteLine();
  if(!geo?.coordinates?.length) return;
  const latlngs = geo.coordinates.map(([lng,lat])=>[lat,lng]);
  routeLine = L.polyline(latlngs, {weight:6, opacity:0.85}).addTo(map);
}

async function optimizeWithOSRM(){
  clearRouteLine();
  const pts=routePoints();
  if(pts.length<2){ throw new Error("Mindestens 2 Stops in der Route."); }
  const missing = pts.filter(m=>!(isNum(m.lat)&&isNum(m.lng)));
  if(missing.length){
    throw new Error("Einige Stops haben keine Koordinaten. Bitte erst Geocoding durchführen.");
  }

  // refresh start location right before planning (iPhone WebApp friendly)
  const fresh = await getMyPosIfPossible();
  if(fresh){
    myPos = fresh;
    save(STORE.myPos, myPos);
  }

  const useStart = myPos && isNum(myPos.lat)&&isNum(myPos.lng);

  // optional: include return trip back to the start point (only possible if we have a start location)
  const chk = document.getElementById("chkReturn");
  const includeReturn = !!(chk && chk.checked);
  const roundtrip = includeReturn && useStart;

  const coords = (useStart ? [{lat:myPos.lat,lng:myPos.lng, __start:true}] : []).concat(
    pts.map(m=>({lat:m.lat,lng:m.lng, id:m.id}))
  );

  const js = await osrmTrip(coords, useStart, roundtrip);
  const trip = js.trips?.[0];
  const wps = js.waypoints || [];
  const ordered = wps
    .map((w, idx)=>({idx, order:w.waypoint_index}))
    .sort((a,b)=>a.order-b.order)
    .map(x=>coords[x.idx]);

  const orderedMarketIds = ordered.filter(o=>!o.__start).map(o=>o.id);
  routeIds = orderedMarketIds;
  save(STORE.route, routeIds);

  const km = (trip?.distance ?? 0) / 1000;
  renderRoute(km);
  renderMarkers();
  drawGeoJsonLine(trip?.geometry);
  if(routeLine) map.fitBounds(routeLine.getBounds().pad(0.15));

  return {km, trip};
}

// ---------- Plan (Google Maps Export) ----------
function buildMapsLinks(points, start){
  const maxStopsPerLink=20;
  if(!points.length) return [];
  const links=[];
  let origin = start && isNum(start.lat)&&isNum(start.lng) ? `${start.lat},${start.lng}` : marketAddr(points[0]);
  let i = (start?0:1);
  while(i<points.length){
    const chunk=points.slice(i, i+maxStopsPerLink);
    const destination=chunk[chunk.length-1];
    const waypoints=chunk.slice(0,-1).map(p=>{
      if(isNum(p.lat)&&isNum(p.lng)) return `${p.lat},${p.lng}`;
      return marketAddr(p);
    });
    const params=new URLSearchParams();
    params.set("api","1");
    params.set("origin", origin);
    params.set("destination", isNum(destination.lat)&&isNum(destination.lng)?`${destination.lat},${destination.lng}`:marketAddr(destination));
    params.set("travelmode","driving");
    if(waypoints.length) params.set("waypoints", waypoints.join("|"));
    links.push(`https://www.google.com/maps/dir/?${params.toString()}`);
    origin = isNum(destination.lat)&&isNum(destination.lng)?`${destination.lat},${destination.lng}`:marketAddr(destination);
    i += chunk.length;
  }
  return links;
}

// ---------- Finalize (auto: current location + OSRM + ready for Maps) ----------
const __btnFinalize = document.getElementById("btnFinalize");
if(__btnFinalize){
  __btnFinalize.addEventListener("click", async ()=>{
    setStatus("Plane Route …");
    setStartEnabled(false);
    __btnFinalize.disabled = true;
    try{
      await optimizeWithOSRM();

      const pts = routePoints();

      // Optional: add return to start for Google Maps export (if enabled + start position known)
      const chk = document.getElementById("chkReturn");
      const includeReturn = !!(chk && chk.checked);
      const ptsForMaps = (includeReturn && myPos && isNum(myPos.lat) && isNum(myPos.lng))
        ? pts.concat([{lat:myPos.lat, lng:myPos.lng, __return:true}])
        : pts;

      const links = buildMapsLinks(ptsForMaps, myPos);
      if(!links.length) throw new Error("Konnte keinen Maps-Link bauen.");
      lastLinks = links;
      save(STORE.lastLinks, lastLinks);
      setStartEnabled(true);
      setStatus("Bereit: Kilometer berechnet. Du kannst jetzt „Starten (Google Maps)“ drücken.");
    } catch(err){
      console.error(err);
      setStatus(err?.message || "Planung fehlgeschlagen.");
    } finally {
      __btnFinalize.disabled = false;
    }
  });
}

// ---------- Start (Stop für Stop) ----------
const __btnStart = document.getElementById("btnStartMaps");
let __navStops = [];
let __navIndex = 0;

function formatAddr(m){
  const a = [m.anschrift, `${m.plz||""} ${m.ort||""}`.trim()].filter(Boolean).join(", ");
  return a || "—";
}
function stopTitle(m){
  const parts = [];
  if(m.name) parts.push(m.name);
  if(m.sap) parts.push(`#${m.sap}`);
  return parts.join(" ") || "Stopp";
}
function buildSingleStopLink(stop){
  // Use device's current location as origin when possible (Google Maps will infer origin if omitted)
  const dest = (isNum(stop.lat) && isNum(stop.lng))
    ? `${stop.lat},${stop.lng}`
    : encodeURIComponent(`${stopTitle(stop)} ${formatAddr(stop)}`);
  if(isNum(stop.lat) && isNum(stop.lng)){
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}&travelmode=driving`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${dest}`;
}
function showNavCard(show){
  const card = document.getElementById("navCard");
  if(!card) return;
  card.hidden = !show;
}
function updateNavUi(){
  const card = document.getElementById("navCard");
  if(!card) return;
  const total = __navStops.length;
  const idx = Math.max(0, Math.min(__navIndex, Math.max(0,total-1)));
  __navIndex = idx;
  const s = __navStops[idx];
  document.getElementById("navTitle").textContent = stopTitle(s);
  document.getElementById("navAddr").textContent = formatAddr(s);
  document.getElementById("navCounter").textContent = `${total? (idx+1):0} / ${total}`;
  // enable/disable prev/next
  const bPrev = document.getElementById("btnPrevStop");
  const bNext = document.getElementById("btnNextStop");
  if(bPrev) bPrev.disabled = idx<=0;
  if(bNext) bNext.disabled = idx>=total-1;
}

function startStopMode(){
  // Speichere Tour (Datum/Uhrzeit + Stops + km)
  try{ recordTourStart(); }catch(e){}

  const pts = routePoints();
  if(!pts.length){
    setStatus("Bitte zuerst „Planung fertigstellen“ drücken.");
    return;
  }

  // Optional return to start (if enabled + start position known)
  const chk = document.getElementById("chkReturn");
  const includeReturn = !!(chk && chk.checked);
  __navStops = pts.slice();

  if(includeReturn && myPos && isNum(myPos.lat) && isNum(myPos.lng)){
    __navStops.push({ name:"Startpunkt (Rückfahrt)", anschrift:"", plz:"", ort:"", sap:"", lat:myPos.lat, lng:myPos.lng, __return:true });
  }

  __navIndex = 0;
  showNavCard(true);
  updateNavUi();
  // Open first stop immediately
  const link = buildSingleStopLink(__navStops[__navIndex]);
  window.open(link, "_blank");
}

if(__btnStart){
  __btnStart.addEventListener("click", startStopMode);
}

// Stop navigation buttons
document.getElementById("btnOpenMaps")?.addEventListener("click", ()=>{
  if(!__navStops.length) return;
  window.open(buildSingleStopLink(__navStops[__navIndex]), "_blank");
});
document.getElementById("btnPrevStop")?.addEventListener("click", ()=>{
  if(!__navStops.length) return;
  __navIndex = Math.max(0, __navIndex-1);
  updateNavUi();
});
document.getElementById("btnNextStop")?.addEventListener("click", ()=>{
  if(!__navStops.length) return;
  __navIndex = Math.min(__navStops.length-1, __navIndex+1);
  updateNavUi();
});
document.getElementById("btnArrived")?.addEventListener("click", ()=>{
  if(!__navStops.length) return;
  if(__navIndex >= __navStops.length-1){
    setStatus("✅ Tour fertig. Gute Heimfahrt!");
    showNavCard(false);
    return;
  }
  __navIndex++;
  updateNavUi();
  window.open(buildSingleStopLink(__navStops[__navIndex]), "_blank");
});


// ---------- Reload ----------
$("btnReload")?.addEventListener("click", ()=>location.reload());


// ---------- Route reset (only planned route, keep markets) ----------
function resetRouteOnly(){
  routeIds = [];
  save(STORE.route, routeIds);
  lastLinks = [];
  save(STORE.lastLinks, lastLinks);
  setStartEnabled(false);
  clearRouteLine();
  renderRoute();
  renderMarkers();
}
const __btnReset = document.getElementById("btnResetRoute");
if(__btnReset){
  __btnReset.addEventListener("click", ()=>{
    if(!routeIds.length) return;
    setStatus("");
    resetRouteOnly();
    setStatus("Route zurückgesetzt.");
  });
}

// ---------- init ----------
setupGate();

// Account-specific data / filters
if(ACCOUNT === "franco"){
  IGNORE_MARKETS = IGNORE_MARKETS_FRANCO;
  if(!markets || !markets.length){
    markets = PRELOADED_FRANCO_MARKETS.slice();
    save(STORE.markets, markets);
  }
} else {
  IGNORE_MARKETS = IGNORE_MARKETS_SELLENCE;
}

$("marketCount").textContent = String(markets.length);
setStartEnabled(Array.isArray(lastLinks) && lastLinks.length>0);
initMap();
renderRoute();
renderMarkers();
fitAll();

// Lock the tour planner area until password is entered (gate overlay blocks clicks)
setTourGateVisible(!isUnlocked());

// Franco: run geotagging automatically, and keep retrying until all markets have coords
(async ()=>{
  if(ACCOUNT === "franco"){
    const missing = markets.filter(m=>!(isNum(m.lat)&&isNum(m.lng))).length;
    if(missing){
      await runGeocoding({auto:true, lock:true, loop:true});
      renderMarkers();
      fitAll();
    }
  }
})();

if("serviceWorker" in navigator){
  window.addEventListener("load", ()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
}

document.addEventListener("DOMContentLoaded",()=>{
 if(localStorage.getItem("introSeen")){
  const o=document.getElementById("introOverlay");
  if(o) o.style.display="none";
 }
});
function closeIntro(){
 localStorage.setItem("introSeen","true");
 const o=document.getElementById("introOverlay");
 const v=document.getElementById("introVideo");
 if(v) v.pause();
 if(o) o.style.display="none";
}

function closeIntro(){
  localStorage.setItem("introSeen","true");
  const o=document.getElementById("introOverlay");
  const v=document.getElementById("introVideo");
  if(v) v.pause();
  if(o){
    o.classList.add("fade-out");
    setTimeout(()=>{ o.style.display="none"; },400);
  }
}


// ---------- Tour Historie ----------
function pad2(n){ return String(n).padStart(2,"0"); }
function fmtDateTime(iso){
  const d = new Date(iso);
  return `${pad2(d.getDate())}.${pad2(d.getMonth()+1)}.${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}
function fmtDate(iso){
  const d = new Date(iso);
  return `${pad2(d.getDate())}.${pad2(d.getMonth()+1)}.${d.getFullYear()}`;
}
function isoDateLocal(d){
  // yyyy-mm-dd in local time
  const dt = new Date(d);
  const y = dt.getFullYear();
  const m = pad2(dt.getMonth()+1);
  const da = pad2(dt.getDate());
  return `${y}-${m}-${da}`;
}
function loadHistory(){
  return load(STORE.history, []);
}
function saveHistory(arr){
  save(STORE.history, arr);
}
function getLastPlannedKm(){
  // UI shows last planned km in #kKm; parse safely
  const el = document.getElementById("kKm");
  if(!el) return null;
  const t = (el.textContent||"").replace(",",".");
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}
function recordTourStart(){
  const pts = routePoints();
  if(!pts.length) return;

  const nowIso = new Date().toISOString();
  const km = getLastPlannedKm();

  const tour = {
    id: "t_" + Math.random().toString(36).slice(2,10) + "_" + Date.now(),
    startedAt: nowIso,
    plannedKm: km,
    stops: pts.map((m,idx)=>({
      idx: idx+1,
      id: m.id || "",
      name: m.name || "",
      sap: m.sap || "",
      anschrift: m.anschrift || "",
      plz: m.plz || "",
      ort: m.ort || "",
      lat: m.lat ?? null,
      lng: m.lng ?? null,
    })),
  };

  const hist = loadHistory();
  hist.unshift(tour);
  saveHistory(hist);
  renderHistory();
}

function historyRange(){
  const fromEl = document.getElementById("hFrom");
  const toEl = document.getElementById("hTo");
  const from = fromEl?.value ? new Date(fromEl.value+"T00:00:00") : null;
  const to = toEl?.value ? new Date(toEl.value+"T23:59:59") : null;
  return {from,to};
}
function filterHistory(hist){
  const {from,to}=historyRange();
  return hist.filter(t=>{
    const d = new Date(t.startedAt);
    if(from && d < from) return false;
    if(to && d > to) return false;
    return true;
  });
}
function sumKm(hist){
  return hist.reduce((acc,t)=> acc + (Number.isFinite(t.plannedKm)?t.plannedKm:0), 0);
}

function renderHistory(){
  const list = document.getElementById("historyList");
  const hKm = document.getElementById("hKm");
  const hTours = document.getElementById("hTours");
  if(!list || !hKm || !hTours) return;

  const all = loadHistory();
  const filtered = filterHistory(all);

  hTours.textContent = String(filtered.length);
  const km = sumKm(filtered);
  hKm.textContent = filtered.length ? formatKm(km) : "—";

  if(!filtered.length){
    list.innerHTML = `<div class="muted">Noch keine Tour gespeichert. Sobald du auf „Starten“ drückst, landet sie hier.</div>`;
    return;
  }

  list.innerHTML = filtered.map(t=>{
    const badgeKm = Number.isFinite(t.plannedKm) ? `${formatKm(t.plannedKm)} km` : "km —";
    const badgeStops = `${(t.stops||[]).length} Stop(s)`;
    const rows = (t.stops||[]).map(s=>`
      <tr>
        <td>${s.idx}</td>
        <td>${escapeHTML(s.name)}</td>
        <td>${escapeHTML([s.plz,s.ort].filter(Boolean).join(" "))}</td>
        <td>${escapeHTML(s.anschrift||"")}</td>
      </tr>
    `).join("");

    return `
      <div class="h-tour">
        <div class="top">
          <div class="meta">
            <span class="h-badge">🕒 ${fmtDateTime(t.startedAt)}</span>
            <span class="h-badge">🧭 ${badgeKm}</span>
            <span class="h-badge">📍 ${badgeStops}</span>
          </div>
        </div>
        <table class="h-table">
          <thead><tr><th>#</th><th>Markt</th><th>Ort</th><th>Anschrift</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  }).join("");
}

function exportHistoryCsv(){
  const all = loadHistory();
  const filtered = filterHistory(all);
  if(!filtered.length){
    setStatus("Keine Touren im gewählten Zeitraum.");
    return;
  }
  const rows = [];
  filtered.forEach(t=>{
    const started = t.startedAt;
    const date = fmtDate(started);
    const time = fmtDateTime(started).split(" ")[1] || "";
    const km = Number.isFinite(t.plannedKm) ? t.plannedKm : "";
    (t.stops||[]).forEach(s=>{
      rows.push({
        tour_started_at: started,
        tour_date: date,
        tour_time: time,
        tour_planned_km: km,
        stop_index: s.idx,
        market_name: s.name || "",
        plz: s.plz || "",
        ort: s.ort || "",
        anschrift: s.anschrift || "",
        sap: s.sap || "",
      });
    });
  });

  const headers = Object.keys(rows[0]);
  const esc = (v)=>{
    const s = String(v ?? "");
    if(/[",\n;]/.test(s)) return `"${s.replace(/"/g,'""')}"`;
    return s;
  };
  const csv = [
    headers.join(";"),
    ...rows.map(r=>headers.map(h=>esc(r[h])).join(";"))
  ].join("\n");

  const blob = new Blob([csv], {type:"text/csv;charset=utf-8"});
  const a = document.createElement("a");
  const stamp = new Date().toISOString().slice(0,19).replace(/[:T]/g,"-");
  a.href = URL.createObjectURL(blob);
  a.download = `sellence-touren-historie_${stamp}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setStatus("CSV export erstellt.");
}

function printHistory(){
  const all = loadHistory();
  const filtered = filterHistory(all);
  if(!filtered.length){
    setStatus("Keine Touren im gewählten Zeitraum.");
    return;
  }
  const km = sumKm(filtered);
  const {from,to}=historyRange();
  const rangeLabel = `${from?isoDateLocal(from):"—"} bis ${to?isoDateLocal(to):"—"}`;

  const html = `
  <html>
  <head>
    <meta charset="utf-8" />
    <title>SELLENCE Tour‑Historie</title>
    <style>
      body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial; padding:20px}
      h1{margin:0 0 6px 0}
      .muted{color:#555}
      .sum{margin:14px 0 18px 0}
      table{width:100%; border-collapse:collapse; margin:8px 0 18px 0}
      th,td{border:1px solid #ccc; padding:6px 8px; text-align:left; vertical-align:top; font-size:12px}
      th{background:#f3f3f3}
      .tour{margin-top:14px}
    </style>
  </head>
  <body>
    <h1>SELLENCE Tour‑Historie</h1>
    <div class="muted">Zeitraum: ${rangeLabel}</div>
    <div class="sum"><b>Gefahrene Kilometer:</b> ${Number.isFinite(km)?km.toFixed(1).replace(".",","):"—"} &nbsp; | &nbsp; <b>Touren:</b> ${filtered.length}</div>
    ${filtered.map(t=>`
      <div class="tour">
        <div><b>Tour:</b> ${fmtDateTime(t.startedAt)} &nbsp; | &nbsp; <b>km:</b> ${Number.isFinite(t.plannedKm)?t.plannedKm.toFixed(1).replace(".",","):"—"} &nbsp; | &nbsp; <b>Stops:</b> ${(t.stops||[]).length}</div>
        <table>
          <thead><tr><th>#</th><th>Markt</th><th>PLZ/Ort</th><th>Anschrift</th></tr></thead>
          <tbody>
            ${(t.stops||[]).map(s=>`
              <tr><td>${s.idx}</td><td>${(s.name||"").replace(/</g,"&lt;")}</td><td>${[s.plz,s.ort].filter(Boolean).join(" ")}</td><td>${(s.anschrift||"").replace(/</g,"&lt;")}</td></tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `).join("")}
    <script>window.print();</script>
  </body>
  </html>`;
  const w = window.open("", "_blank");
  if(!w){ setStatus("Popup blockiert – bitte Popups erlauben."); return; }
  w.document.open();
  w.document.write(html);
  w.document.close();
}

function initHistoryUI(){
  const card = document.getElementById("historyCard");
  if(!card) return;

  const fromEl = document.getElementById("hFrom");
  const toEl = document.getElementById("hTo");

  // Default: last 30 days
  const now = new Date();
  const to = new Date(now);
  const from = new Date(now);
  from.setDate(from.getDate()-30);
  if(fromEl && !fromEl.value) fromEl.value = isoDateLocal(from);
  if(toEl && !toEl.value) toEl.value = isoDateLocal(to);

  const rer = ()=>renderHistory();
  fromEl?.addEventListener("change", rer);
  toEl?.addEventListener("change", rer);

  document.getElementById("btnRangeToday")?.addEventListener("click", ()=>{
    const d = new Date();
    fromEl.value = isoDateLocal(d);
    toEl.value = isoDateLocal(d);
    renderHistory();
  });
  document.getElementById("btnRangeWeek")?.addEventListener("click", ()=>{
    const d = new Date();
    const start = new Date(d);
    start.setDate(d.getDate()-6);
    fromEl.value = isoDateLocal(start);
    toEl.value = isoDateLocal(d);
    renderHistory();
  });
  document.getElementById("btnRangeMonth")?.addEventListener("click", ()=>{
    const d = new Date();
    const start = new Date(d);
    start.setMonth(d.getMonth()-1);
    fromEl.value = isoDateLocal(start);
    toEl.value = isoDateLocal(d);
    renderHistory();
  });

  document.getElementById("btnExportCsv")?.addEventListener("click", exportHistoryCsv);
  document.getElementById("btnPrintHistory")?.addEventListener("click", printHistory);
  document.getElementById("btnClearHistory")?.addEventListener("click", ()=>{
    if(confirm("Historie wirklich löschen? (Nur auf diesem Gerät)")){
      saveHistory([]);
      renderHistory();
      setStatus("Historie gelöscht.");
    }
  });

  renderHistory();
}

document.addEventListener("DOMContentLoaded", initHistoryUI);


/* Fahrdaten Drawer (Menüeintrag) */
document.addEventListener("DOMContentLoaded", ()=>{
  const btn = document.getElementById("btnFahrdaten");
  const drawer = document.getElementById("fahrdatenDrawer");
  const close = document.getElementById("closeFahrdaten");
  const body = document.getElementById("fahrdatenBody");
  const history = document.getElementById("historyCard");

  // Existing menu elements
  const menuBtn = document.getElementById("menuBtn");
  const menuPanel = document.getElementById("menuPanel");

  // Move history card into drawer (keeps all functionality)
  if(history && body && !body.contains(history)){
    body.appendChild(history);
  }

  const openDrawer = ()=>{
    if(!drawer) return;
    drawer.classList.add("open");
    drawer.setAttribute("aria-hidden","false");
    // close the small menu panel
    if(menuPanel){
      menuPanel.classList.remove("open");
      menuPanel.setAttribute("aria-hidden","true");
    }
  };
  const closeDrawer = ()=>{
    if(!drawer) return;
    drawer.classList.remove("open");
    drawer.setAttribute("aria-hidden","true");
  };

  btn?.addEventListener("click", openDrawer);
  close?.addEventListener("click", closeDrawer);

  // Close drawer on ESC
  document.addEventListener("keydown", (e)=>{
    if(e.key==="Escape") closeDrawer();
  });
});
