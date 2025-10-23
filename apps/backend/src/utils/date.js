const startOfDay = (date) => {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    return result;
};

const addDays = (date, days) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
};

const computeDateRange = (period, startDate, endDate) => {
    const today = new Date();
    const todayStart = startOfDay(today);

    switch (period) {
        case 'today': {
            const start = todayStart;
            const end = addDays(todayStart, 1);
            return { start, end };
        }
        case 'yesterday': {
            const start = addDays(todayStart, -1);
            const end = todayStart;
            return { start, end };
        }
        case 'week': {
            const start = addDays(todayStart, -6);
            const end = addDays(todayStart, 1);
            return { start, end };
        }
        case 'month': {
            const start = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1);
            const end = new Date(todayStart.getFullYear(), todayStart.getMonth() + 1, 1);
            return { start, end };
        }
        case 'range': {
            if (!startDate || !endDate) {
                throw new Error('startDate y endDate son requeridos para el rango personalizado.');
            }
            const start = startOfDay(new Date(startDate));
            const end = addDays(startOfDay(new Date(endDate)), 1);
            if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
                throw new Error('Las fechas proporcionadas no son válidas.');
            }
            if (start >= end) {
                throw new Error('El rango de fechas es inválido.');
            }
            return { start, end };
        }
        default:
            return null;
    }
};

module.exports = {
    addDays,
    computeDateRange,
    startOfDay,
};
