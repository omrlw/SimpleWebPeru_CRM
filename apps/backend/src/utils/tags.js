const normalizeTags = (tags) => {
    if (!tags) return [];
    if (Array.isArray(tags)) {
        return tags.filter(Boolean).map((tag) => String(tag).trim()).filter((tag) => tag.length > 0);
    }
    return String(tags)
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);
};

module.exports = {
    normalizeTags,
};
