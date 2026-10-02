// Self-contained QR payload: no server, local database IDs or device file paths.
// Reminder preferences are intentionally excluded: each recipient uses their own defaults.
const PREFIX = 'SHAMPOO:1:';
export const SHARE_LINK_BASE = 'https://shampoolove.github.io/schedule/create/';
export function parseSharedSchedule(value) {
    if (value.startsWith('https://')) {
        if (value.length > 4096)
            throw new Error('일정 링크가 너무 깁니다.');
        let url;
        try {
            url = new URL(value);
        }
        catch {
            throw new Error('일정 링크가 올바르지 않습니다.');
        }
        if (url.origin !== 'https://shampoolove.github.io' || url.pathname !== '/schedule/create/' ||
            url.username || url.password || url.hash || url.searchParams.getAll('share').length !== 1) {
            throw new Error('샴푸 일정 링크가 아닙니다.');
        }
        value = url.searchParams.get('share');
    }
    if (value.length > 1000 || !value.startsWith(PREFIX))
        throw new Error('샴푸 일정 QR이 아닙니다.');
    let data;
    try {
        data = JSON.parse(value.slice(PREFIX.length));
    }
    catch {
        throw new Error('일정 QR을 읽을 수 없습니다.');
    }
    if (!Array.isArray(data) || data.length !== 4)
        throw new Error('일정 정보가 올바르지 않습니다.');
    const [gameName, title, startTime, allDay] = data;
    if (typeof gameName !== 'string' || !gameName.trim() || gameName.length > 60 ||
        typeof title !== 'string' || !title.trim() || title.length > 100 ||
        typeof startTime !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00$/.test(startTime) ||
        (allDay !== 0 && allDay !== 1))
        throw new Error('일정 정보가 올바르지 않습니다.');
    const [y, m, d, h, min] = startTime.match(/\d+/g).map(Number);
    const date = new Date(y, m - 1, d, h, min);
    if (y < 2000 || y > 2100 || date.getFullYear() !== y || date.getMonth() !== m - 1 ||
        date.getDate() !== d || date.getHours() !== h || date.getMinutes() !== min) {
        throw new Error('일정 날짜 또는 시간이 올바르지 않습니다.');
    }
    return { gameName: gameName.trim(), title: title.trim(), startTime, isAllDay: allDay === 1 };
}
export function encodeSharedSchedule(schedule) {
    const value = PREFIX + JSON.stringify([schedule.gameName, schedule.title, schedule.startTime, schedule.isAllDay ? 1 : 0]);
    parseSharedSchedule(value);
    return value;
}
export function encodeSharedScheduleLink(schedule) {
    return SHARE_LINK_BASE + '?share=' + encodeURIComponent(encodeSharedSchedule(schedule));
}
export function findSharedSchedule(values) {
    const candidates = [...new Set(values.filter((value) => value.startsWith(PREFIX) || value.startsWith(SHARE_LINK_BASE + '?')))];
    if (candidates.length > 1)
        throw new Error('일정 QR이 여러 개입니다. 한 일정의 이미지를 선택해주세요.');
    if (!candidates.length)
        throw new Error('샴푸 일정 QR을 찾지 못했습니다. QR이 포함된 공유 이미지 전체를 선택해주세요.');
    return parseSharedSchedule(candidates[0]);
}
