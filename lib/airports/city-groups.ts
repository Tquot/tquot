/**
 * Ciudades del mundo con múltiples aeropuertos relevantes.
 *
 * - `key`: identificador estable que usa el sistema internamente
 * - `aliases`: nombres por los que el agente puede referirse (multi-idioma)
 * - `airports`: IATAs ordenados de MÁS a MENOS importante.
 *               El primero es el que se selecciona por defecto.
 *
 * Solo ciudades con 2+ aeropuertos REALMENTE usables comercialmente.
 * Aeropuertos de aviación general, militares o de carga NO se incluyen.
 *
 * Mantenimiento: revisar 1-2 veces al año.
 */

export interface CityGroup {
  key: string;
  aliases: string[];
  country: string;
  airports: string[]; // IATAs, principal primero
}

export const CITY_GROUPS: CityGroup[] = [
  // ─── Europa ───
  {
    key: "london",
    aliases: ["london", "londres", "londra", "londyn"],
    country: "GB",
    airports: ["LHR", "LGW", "STN", "LTN", "LCY", "SEN"],
  },
  {
    key: "paris",
    aliases: ["paris", "parís", "parigi", "paryż"],
    country: "FR",
    airports: ["CDG", "ORY", "BVA"],
  },
  {
    key: "milan",
    aliases: ["milan", "milán", "milano", "mediolan"],
    country: "IT",
    airports: ["MXP", "LIN", "BGY"],
  },
  {
    key: "rome",
    aliases: ["rome", "roma", "rom"],
    country: "IT",
    airports: ["FCO", "CIA"],
  },
  {
    key: "berlin",
    aliases: ["berlin", "berlín"],
    country: "DE",
    airports: ["TXL", "SXF"],
  },
  {
    key: "moscow",
    aliases: ["moscow", "moscú", "moskva", "moskau"],
    country: "RU",
    airports: ["SVO", "DME", "VKO"],
  },
  {
    key: "istanbul",
    aliases: ["istanbul", "estambul", "istanboul"],
    country: "TR",
    airports: ["IST", "SAW"],
  },
  {
    key: "stockholm",
    aliases: ["stockholm", "estocolmo", "sztokholm"],
    country: "SE",
    airports: ["ARN", "BMA", "NYO", "VST"],
  },
  {
    key: "oslo",
    aliases: ["oslo"],
    country: "NO",
    airports: ["OSL", "TRF"],
  },
  {
    key: "barcelona",
    aliases: ["barcelona"],
    country: "ES",
    airports: ["BCN", "GRO", "REU"],
  },
  {
    key: "lanzarote",
    aliases: ["lanzarote"],
    country: "ES",
    airports: ["ACE"],
  },
  {
    key: "fuerteventura",
    aliases: ["fuerteventura"],
    country: "ES",
    airports: ["FUE"],
  },
  {
    key: "gran_canaria",
    aliases: ["gran canaria", "las palmas"],
    country: "ES",
    airports: ["LPA"],
  },
  {
    key: "tenerife",
    aliases: ["tenerife", "tenerife sur", "tenerife norte"],
    country: "ES",
    airports: ["TFS", "TFN"],
  },
  {
    key: "la_palma",
    aliases: ["la palma"],
    country: "ES",
    airports: ["SPC"],
  },
  {
    key: "el_hierro",
    aliases: ["el hierro"],
    country: "ES",
    airports: ["VDE"],
  },
  {
    key: "la_gomera",
    aliases: ["la gomera"],
    country: "ES",
    airports: ["GMZ"],
  },
  {
    key: "ibiza",
    aliases: ["ibiza", "eivissa"],
    country: "ES",
    airports: ["IBZ"],
  },
  {
    key: "menorca",
    aliases: ["menorca"],
    country: "ES",
    airports: ["MAH"],
  },
  {
    key: "mallorca",
    aliases: ["mallorca", "palma", "palma de mallorca"],
    country: "ES",
    airports: ["PMI"],
  },
  {
    key: "formentera",
    aliases: ["formentera"],
    country: "ES",
    airports: ["IBZ"],
  },
  {
    key: "madrid",
    aliases: ["madrid"],
    country: "ES",
    airports: ["MAD"],
  },
  {
    key: "bilbao",
    aliases: ["bilbao"],
    country: "ES",
    airports: ["BIO"],
  },
  {
    key: "ribadesella",
    aliases: ["ribadesella"],
    country: "ES",
    airports: ["OVD"],
  },
  {
    key: "gijon",
    aliases: ["gijón", "gijon"],
    country: "ES",
    airports: ["OVD"],
  },
  {
    key: "oviedo",
    aliases: ["oviedo"],
    country: "ES",
    airports: ["OVD"],
  },
  {
    key: "santander_city",
    aliases: ["santander"],
    country: "ES",
    airports: ["SDR"],
  },
  {
    key: "burgos",
    aliases: ["burgos"],
    country: "ES",
    airports: ["RGS"],
  },
  {
    key: "toledo",
    aliases: ["toledo"],
    country: "ES",
    airports: ["MAD"],
  },
  {
    key: "segovia",
    aliases: ["segovia"],
    country: "ES",
    airports: ["MAD"],
  },
  {
    key: "granada",
    aliases: ["granada"],
    country: "ES",
    airports: ["GRX"],
  },
  {
    key: "cordoba",
    aliases: ["córdoba", "cordoba"],
    country: "ES",
    airports: ["SVQ"],
  },
  {
    key: "ronda",
    aliases: ["ronda"],
    country: "ES",
    airports: ["AGP"],
  },

  // ─── Norteamérica ───
  {
    key: "new_york",
    aliases: ["new york", "nueva york", "nyc", "ny"],
    country: "US",
    airports: ["JFK", "EWR", "LGA"],
  },
  {
    key: "washington",
    aliases: ["washington", "washington dc", "dc"],
    country: "US",
    airports: ["IAD", "DCA", "BWI"],
  },
  {
    key: "chicago",
    aliases: ["chicago"],
    country: "US",
    airports: ["ORD", "MDW"],
  },
  {
    key: "los_angeles",
    aliases: ["los angeles", "los ángeles", "la"],
    country: "US",
    airports: ["LAX", "BUR", "LGB", "ONT", "SNA"],
  },
  {
    key: "san_francisco",
    aliases: ["san francisco", "sf", "bay area"],
    country: "US",
    airports: ["SFO", "OAK", "SJC"],
  },
  {
    key: "houston",
    aliases: ["houston"],
    country: "US",
    airports: ["IAH", "HOU"],
  },
  {
    key: "dallas",
    aliases: ["dallas", "dallas fort worth", "dfw"],
    country: "US",
    airports: ["DFW", "DAL"],
  },
  {
    key: "miami",
    aliases: ["miami"],
    country: "US",
    airports: ["MIA", "FLL"],
  },
  {
    key: "toronto",
    aliases: ["toronto"],
    country: "CA",
    airports: ["YYZ", "YTZ"],
  },
  {
    key: "montreal",
    aliases: ["montreal", "montréal"],
    country: "CA",
    airports: ["YUL", "YMX"],
  },

  // ─── Asia ───
  {
    key: "tokyo",
    aliases: ["tokyo", "tokio", "tōkyō"],
    country: "JP",
    airports: ["HND", "NRT"],
  },
  {
    key: "osaka",
    aliases: ["osaka", "ōsaka"],
    country: "JP",
    airports: ["KIX", "ITM"],
  },
  {
    key: "seoul",
    aliases: ["seoul", "seúl"],
    country: "KR",
    airports: ["ICN", "GMP"],
  },
  {
    key: "shanghai",
    aliases: ["shanghai", "shanghái"],
    country: "CN",
    airports: ["PVG", "SHA"],
  },
  {
    key: "beijing",
    aliases: ["beijing", "pekín", "peking"],
    country: "CN",
    airports: ["PEK", "PKX"],
  },
  {
    key: "bangkok",
    aliases: ["bangkok"],
    country: "TH",
    airports: ["BKK", "DMK"],
  },
  {
    key: "jakarta",
    aliases: ["jakarta", "yakarta"],
    country: "ID",
    airports: ["CGK", "HLP"],
  },

  // ─── Sudamérica ───
  {
    key: "sao_paulo",
    aliases: ["sao paulo", "são paulo"],
    country: "BR",
    airports: ["GRU", "CGH", "VCP"],
  },
  {
    key: "rio_de_janeiro",
    aliases: ["rio de janeiro", "rio", "río de janeiro"],
    country: "BR",
    airports: ["GIG", "SDU"],
  },
  {
    key: "buenos_aires",
    aliases: ["buenos aires"],
    country: "AR",
    airports: ["EZE", "AEP"],
  },

  // ─── Otros ───
  {
    key: "dubai",
    aliases: ["dubai", "dubái"],
    country: "AE",
    airports: ["DXB", "DWC"],
  },
  {
    key: "johannesburg",
    aliases: ["johannesburg", "johannesburgo"],
    country: "ZA",
    airports: ["JNB", "HLA"],
  },
  {
    key: "sydney",
    aliases: ["sydney"],
    country: "AU",
    airports: ["SYD"],
  },
  {
    key: "melbourne",
    aliases: ["melbourne"],
    country: "AU",
    airports: ["MEL", "AVV"],
  },
];
