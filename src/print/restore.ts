import { replacePlaceholders } from '../helpers/placeholders';

export function restoreDoc(value: unknown, placeholders: Record<string, string>): unknown {
    if (Object.keys(placeholders).length === 0) {
        return value;
    }

    if (typeof value === 'string') {
        return replacePlaceholders(value, placeholders);
    }

    if (Array.isArray(value)) {
        for (let index = 0; index < value.length; index += 1) {
            value[index] = restoreDoc(value[index], placeholders);
        }

        return value;
    }

    if (!value || typeof value !== 'object') {
        return value;
    }

    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
        (value as Record<string, unknown>)[key] = restoreDoc(child, placeholders);
    }

    return value;
}
