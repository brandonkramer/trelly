export type Rec = Record<string, unknown>;

export function isRecord(v: unknown): v is Rec {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function isCard(v: unknown): v is Rec {
  return isRecord(v) && typeof v.name === "string" && "idList" in v;
}

export function isBoard(v: unknown): v is Rec {
  return (
    isRecord(v) &&
    typeof v.name === "string" &&
    !("idBoard" in v) &&
    !("idList" in v) &&
    ("prefs" in v || "idOrganization" in v || "shortUrl" in v)
  );
}

export function isList(v: unknown): v is Rec {
  return (
    isRecord(v) &&
    typeof v.name === "string" &&
    "idBoard" in v &&
    "pos" in v &&
    !("idList" in v) &&
    !("color" in v)
  );
}

export function isLabel(v: unknown): v is Rec {
  return isRecord(v) && "color" in v && "idBoard" in v && !("pos" in v);
}

export function isMember(v: unknown): v is Rec {
  return isRecord(v) && typeof v.username === "string";
}

export function isWebhook(v: unknown): v is Rec {
  return isRecord(v) && "callbackURL" in v;
}

export function isAction(v: unknown): v is Rec {
  return (
    isRecord(v) && typeof v.type === "string" && "date" in v && "idMemberCreator" in v
  );
}

export function isChecklist(v: unknown): v is Rec {
  return isRecord(v) && Array.isArray(v.checkItems) && "idCard" in v;
}

export function isSearchResult(v: unknown): v is Rec {
  return (
    isRecord(v) && "options" in v && (Array.isArray(v.cards) || Array.isArray(v.boards))
  );
}

export function isProfilesPayload(v: unknown): v is Rec {
  return (
    isRecord(v) && Array.isArray(v.profiles) && typeof v.defaultProfile === "string"
  );
}

export function isMessagePayload(v: unknown): v is Rec {
  return isRecord(v) && typeof v.message === "string";
}
