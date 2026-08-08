import type { TechChoiceCategory, TechChoiceOption } from '../types/chat';

/**
 * Defensively coerces an unknown tech_choices payload into TechChoiceCategory[].
 *
 * We do not yet have a real backend payload to verify field names against
 * (see the ASSUMPTION note on TechChoiceCategory in types/chat.ts). This
 * accepts a few common naming variants per field and silently drops any
 * entry it can't make sense of, rather than throwing — an unexpected shape
 * degrades to "no tech choices to show" instead of crashing the whole
 * gap-analysis panel.
 *
 * TODO once a real payload is confirmed: trim the fallback key lists below
 * to the actual field names and delete this comment.
 */
export function normalizeTechChoices(raw: unknown): TechChoiceCategory[] {
    if (!Array.isArray(raw)) return [];

    const categories: TechChoiceCategory[] = [];

    for (const entry of raw) {
        if (!entry || typeof entry !== 'object') continue;
        const obj = entry as Record<string, unknown>;

        const category = firstString(obj, ['category', 'name', 'title', 'group']);
        const rawOptions = firstArray(obj, ['options', 'choices', 'items', 'values']);
        if (!category || !rawOptions) continue;

        const options: TechChoiceOption[] = [];
        for (const o of rawOptions) {
            if (typeof o === 'string') {
                // plain string option — use it as both id and label
                options.push({ id: o, label: o });
                continue;
            }
            if (!o || typeof o !== 'object') continue;

            const optObj = o as Record<string, unknown>;
            const id = firstString(optObj, ['id', 'value', 'key', 'slug']);
            const label = firstString(optObj, ['label', 'name', 'title']) ?? id;
            const description = firstString(optObj, ['description', 'desc', 'subtitle']);
            if (!id || !label) continue;

            options.push({ id, label, description });
        }

        if (options.length > 0) {
            categories.push({ category, options });
        }
    }

    return categories;
}

function firstString(obj: Record<string, unknown>, keys: string[]): string | undefined {
    for (const k of keys) {
        const v = obj[k];
        if (typeof v === 'string' && v.trim()) return v;
    }
    return undefined;
}

function firstArray(obj: Record<string, unknown>, keys: string[]): unknown[] | undefined {
    for (const k of keys) {
        const v = obj[k];
        if (Array.isArray(v)) return v;
    }
    return undefined;
}