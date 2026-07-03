import { formatDue } from "./palette.ts";

export type UiCustomFieldOption = { id: string; text: string; color: string | null };

export type UiCustomFieldDef = {
  id: string;
  name: string;
  type: string;
  cardFront: boolean;
  options: UiCustomFieldOption[];
};

export type UiCustomFieldItem = {
  idCustomField: string;
  idValue?: string | null;
  value?: { text?: string; number?: string; date?: string; checked?: string } | null;
};

export type CardChip = { id: string; label: string; color: string | null };

type RawCustomFieldDef = {
  id: string;
  name: string;
  type: string;
  display?: { cardFront?: boolean };
  options?: Array<{ id: string; color?: string | null; value?: { text?: string } }>;
};

export function toCustomFieldDefs(raw: unknown): UiCustomFieldDef[] {
  if (!Array.isArray(raw)) return [];
  return (raw as RawCustomFieldDef[]).map((def) => ({
    id: def.id,
    name: def.name,
    type: def.type,
    cardFront: def.display?.cardFront === true,
    options: (def.options ?? []).map((opt) => ({
      id: opt.id,
      text: opt.value?.text ?? "",
      color: opt.color ?? null,
    })),
  }));
}

/** Resolve a card's custom field items to displayable chips. */
export function customFieldChips(
  defs: UiCustomFieldDef[],
  items: UiCustomFieldItem[] | undefined,
): CardChip[] {
  const chips: CardChip[] = [];
  for (const item of items ?? []) {
    const def = defs.find((d) => d.id === item.idCustomField);
    if (!def) continue;
    if (item.idValue) {
      const opt = def.options.find((o) => o.id === item.idValue);
      if (opt) {
        chips.push({ id: def.id, label: `${def.name}: ${opt.text}`, color: opt.color });
      }
      continue;
    }
    const value = item.value;
    if (!value) continue;
    if (value.checked !== undefined) {
      if (value.checked === "true") {
        chips.push({ id: def.id, label: `${def.name} ✓`, color: null });
      }
      continue;
    }
    const text =
      value.text ?? value.number ?? (value.date ? formatDue(value.date) : undefined);
    if (text !== undefined) {
      chips.push({ id: def.id, label: `${def.name}: ${text}`, color: null });
    }
  }
  return chips;
}
