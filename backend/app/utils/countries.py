"""ISO Country mapping and flag helper for Nexonic IPTV v2."""

COUNTRY_DATA = {
    "AF": {"name": "Afghanistan", "flag": "🇦🇫"},
    "AL": {"name": "Albania", "flag": "🇦🇱"},
    "DZ": {"name": "Algeria", "flag": "🇩🇿"},
    "AD": {"name": "Andorra", "flag": "🇦🇩"},
    "AO": {"name": "Angola", "flag": "🇦🇴"},
    "AR": {"name": "Argentina", "flag": "🇦🇷"},
    "AM": {"name": "Armenia", "flag": "🇦🇲"},
    "AU": {"name": "Australia", "flag": "🇦🇺"},
    "AT": {"name": "Austria", "flag": "🇦🇹"},
    "AZ": {"name": "Azerbaijan", "flag": "🇦🇿"},
    "BS": {"name": "Bahamas", "flag": "🇧🇸"},
    "BH": {"name": "Bahrain", "flag": "🇧🇭"},
    "BD": {"name": "Bangladesh", "flag": "🇧🇩"},
    "BB": {"name": "Barbados", "flag": "🇧🇧"},
    "BY": {"name": "Belarus", "flag": "🇧🇾"},
    "BE": {"name": "Belgium", "flag": "🇧🇪"},
    "BZ": {"name": "Belize", "flag": "🇧🇿"},
    "BJ": {"name": "Benin", "flag": "🇧🇯"},
    "BO": {"name": "Bolivia", "flag": "🇧🇴"},
    "BA": {"name": "Bosnia and Herzegovina", "flag": "🇧🇦"},
    "BW": {"name": "Botswana", "flag": "🇧🇼"},
    "BR": {"name": "Brazil", "flag": "🇧🇷"},
    "BG": {"name": "Bulgaria", "flag": "🇧🇬"},
    "BF": {"name": "Burkina Faso", "flag": "🇧🇫"},
    "KH": {"name": "Cambodia", "flag": "🇰🇭"},
    "CM": {"name": "Cameroon", "flag": "🇨🇲"},
    "CA": {"name": "Canada", "flag": "🇨🇦"},
    "CL": {"name": "Chile", "flag": "🇨🇱"},
    "CN": {"name": "China", "flag": "🇨🇳"},
    "CO": {"name": "Colombia", "flag": "🇨🇴"},
    "CR": {"name": "Costa Rica", "flag": "🇨🇷"},
    "HR": {"name": "Croatia", "flag": "🇭🇷"},
    "CU": {"name": "Cuba", "flag": "🇨🇺"},
    "CY": {"name": "Cyprus", "flag": "🇨🇾"},
    "CZ": {"name": "Czech Republic", "flag": "🇨🇿"},
    "DK": {"name": "Denmark", "flag": "🇩🇰"},
    "DO": {"name": "Dominican Republic", "flag": "🇩🇴"},
    "EC": {"name": "Ecuador", "flag": "🇪🇨"},
    "EG": {"name": "Egypt", "flag": "🇪🇬"},
    "SV": {"name": "El Salvador", "flag": "🇸🇻"},
    "EE": {"name": "Estonia", "flag": "🇪🇪"},
    "ET": {"name": "Ethiopia", "flag": "🇪🇹"},
    "FI": {"name": "Finland", "flag": "🇫🇮"},
    "FR": {"name": "France", "flag": "🇫🇷"},
    "GE": {"name": "Georgia", "flag": "🇬🇪"},
    "DE": {"name": "Germany", "flag": "🇩🇪"},
    "GH": {"name": "Ghana", "flag": "🇬🇭"},
    "GR": {"name": "Greece", "flag": "🇬🇷"},
    "GT": {"name": "Guatemala", "flag": "🇬🇹"},
    "HT": {"name": "Haiti", "flag": "🇭🇹"},
    "HN": {"name": "Honduras", "flag": "🇭🇳"},
    "HK": {"name": "Hong Kong", "flag": "🇭🇰"},
    "HU": {"name": "Hungary", "flag": "🇭🇺"},
    "IS": {"name": "Iceland", "flag": "🇮🇸"},
    "IN": {"name": "India", "flag": "🇮🇳"},
    "ID": {"name": "Indonesia", "flag": "🇮🇩"},
    "IR": {"name": "Iran", "flag": "🇮🇷"},
    "IQ": {"name": "Iraq", "flag": "🇮🇶"},
    "IE": {"name": "Ireland", "flag": "🇮🇪"},
    "IL": {"name": "Israel", "flag": "🇮🇱"},
    "IT": {"name": "Italy", "flag": "🇮🇹"},
    "JM": {"name": "Jamaica", "flag": "🇯🇲"},
    "JP": {"name": "Japan", "flag": "🇯🇵"},
    "JO": {"name": "Jordan", "flag": "🇯🇴"},
    "KZ": {"name": "Kazakhstan", "flag": "🇰🇿"},
    "KE": {"name": "Kenya", "flag": "🇰🇪"},
    "KW": {"name": "Kuwait", "flag": "🇰🇼"},
    "LV": {"name": "Latvia", "flag": "🇱🇻"},
    "LB": {"name": "Lebanon", "flag": "🇱🇧"},
    "LY": {"name": "Libya", "flag": "🇱🇾"},
    "LT": {"name": "Lithuania", "flag": "🇱🇹"},
    "LU": {"name": "Luxembourg", "flag": "🇱🇺"},
    "MY": {"name": "Malaysia", "flag": "🇲🇾"},
    "MV": {"name": "Maldives", "flag": "🇲🇻"},
    "MT": {"name": "Malta", "flag": "🇲🇹"},
    "MX": {"name": "Mexico", "flag": "🇲🇽"},
    "MD": {"name": "Moldova", "flag": "🇲🇩"},
    "MC": {"name": "Monaco", "flag": "🇲🇨"},
    "MN": {"name": "Mongolia", "flag": "🇲🇳"},
    "ME": {"name": "Montenegro", "flag": "🇲🇪"},
    "MA": {"name": "Morocco", "flag": "🇲🇦"},
    "NP": {"name": "Nepal", "flag": "🇳🇵"},
    "NL": {"name": "Netherlands", "flag": "🇳🇱"},
    "NZ": {"name": "New Zealand", "flag": "🇳🇿"},
    "NI": {"name": "Nicaragua", "flag": "🇳🇮"},
    "NG": {"name": "Nigeria", "flag": "🇳🇬"},
    "MK": {"name": "North Macedonia", "flag": "🇲🇰"},
    "NO": {"name": "Norway", "flag": "🇳🇴"},
    "OM": {"name": "Oman", "flag": "🇴🇲"},
    "PK": {"name": "Pakistan", "flag": "🇵🇰"},
    "PS": {"name": "Palestine", "flag": "🇵🇸"},
    "PA": {"name": "Panama", "flag": "🇵🇦"},
    "PY": {"name": "Paraguay", "flag": "🇵🇾"},
    "PE": {"name": "Peru", "flag": "🇵🇪"},
    "PH": {"name": "Philippines", "flag": "🇵🇭"},
    "PL": {"name": "Poland", "flag": "🇵🇱"},
    "PT": {"name": "Portugal", "flag": "🇵🇹"},
    "QA": {"name": "Qatar", "flag": "🇶🇦"},
    "RO": {"name": "Romania", "flag": "🇷🇴"},
    "RU": {"name": "Russia", "flag": "🇷🇺"},
    "SA": {"name": "Saudi Arabia", "flag": "🇸🇦"},
    "SN": {"name": "Senegal", "flag": "🇸🇳"},
    "RS": {"name": "Serbia", "flag": "🇷🇸"},
    "SG": {"name": "Singapore", "flag": "🇸🇬"},
    "SK": {"name": "Slovakia", "flag": "🇸🇰"},
    "SI": {"name": "Slovenia", "flag": "🇸🇮"},
    "SO": {"name": "Somalia", "flag": "🇸🇴"},
    "ZA": {"name": "South Africa", "flag": "🇿🇦"},
    "KR": {"name": "South Korea", "flag": "🇰🇷"},
    "ES": {"name": "Spain", "flag": "🇪🇸"},
    "LK": {"name": "Sri Lanka", "flag": "🇱🇰"},
    "SD": {"name": "Sudan", "flag": "🇸🇩"},
    "SE": {"name": "Sweden", "flag": "🇸🇪"},
    "CH": {"name": "Switzerland", "flag": "🇨🇭"},
    "SY": {"name": "Syria", "flag": "🇸🇾"},
    "TW": {"name": "Taiwan", "flag": "🇹🇼"},
    "TH": {"name": "Thailand", "flag": "🇹🇭"},
    "TN": {"name": "Tunisia", "flag": "🇹🇳"},
    "TR": {"name": "Turkey", "flag": "🇹🇷"},
    "UG": {"name": "Uganda", "flag": "🇺🇬"},
    "UA": {"name": "Ukraine", "flag": "🇺🇦"},
    "AE": {"name": "United Arab Emirates", "flag": "🇦🇪"},
    "GB": {"name": "United Kingdom", "flag": "🇬🇧"},
    "US": {"name": "United States", "flag": "🇺🇸"},
    "UY": {"name": "Uruguay", "flag": "🇺🇾"},
    "UZ": {"name": "Uzbekistan", "flag": "🇺🇿"},
    "VE": {"name": "Venezuela", "flag": "🇻🇪"},
    "VN": {"name": "Vietnam", "flag": "🇻🇳"},
    "YE": {"name": "Yemen", "flag": "🇾🇪"},
    "ZM": {"name": "Zambia", "flag": "🇿🇲"},
    "ZW": {"name": "Zimbabwe", "flag": "🇿🇼"},
    "INT": {"name": "International", "flag": "🌐"},
}

# Precompute lowercase lookup map
NAME_TO_CODE = {}
for code, d in COUNTRY_DATA.items():
    NAME_TO_CODE[d["name"].lower()] = code
    NAME_TO_CODE[code.lower()] = code

def code_to_flag(country_code: str) -> str:
    if not country_code:
        return "🌐"
    code = country_code.upper().strip()
    if code in COUNTRY_DATA:
        return COUNTRY_DATA[code]["flag"]
    if len(code) == 2 and code.isalpha():
        return chr(ord(code[0]) + 127397) + chr(ord(code[1]) + 127397)
    return "🌐"

def normalize_country(code_or_name: str) -> tuple[str, str, str]:
    if not code_or_name:
        return "INT", "International", "🌐"
    val = code_or_name.strip()
    lower = val.lower()
    
    if lower in NAME_TO_CODE:
        c_code = NAME_TO_CODE[lower]
        return c_code, COUNTRY_DATA[c_code]["name"], COUNTRY_DATA[c_code]["flag"]

    upper = val.upper()
    if len(upper) == 2 and upper.isalpha():
        return upper, upper, code_to_flag(upper)

    return "INT", val, "🌐"
