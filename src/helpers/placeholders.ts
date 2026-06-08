import type { PlaceholderKind, PlaceholderRecord } from '../types';

const PLACEHOLDER_PREFIX = 'PRETTIERDJANGO';

function placeholderKey(kind: PlaceholderKind, id: number): string {
    return `${PLACEHOLDER_PREFIX}_${kind.toUpperCase()}_${id}`;
}

export class PlaceholderStore {
    private nextId = 0;
    private readonly records: PlaceholderRecord[] = [];

    add(value: string, kind: PlaceholderKind): string {
        const key = placeholderKey(kind, this.nextId++);
        this.records.push({ key, value, kind });

        if (kind === 'block' || kind === 'raw') {
            return `<!--${key}-->`;
        }

        return key;
    }

    toObject(): Record<string, string> {
        const entries: Array<[string, string]> = [];

        for (const { key, value, kind } of this.records) {
            entries.push([key, value]);

            if (kind === 'block' || kind === 'raw') {
                entries.push([`<!--${key}-->`, value]);
            }
        }

        return Object.fromEntries(entries);
    }
}

export function replacePlaceholders(value: string, placeholders: Record<string, string>): string {
    let output = value;
    const entries = Object.entries(placeholders).sort(([left], [right]) => right.length - left.length);

    for (const [key, replacement] of entries) {
        output = output.split(key).join(replacement);
    }

    return output;
}
