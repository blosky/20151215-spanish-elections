
export function sizeToStr(size) {
    var unit = 0, units = ['B','KB','MB','GB','TB'];
    while (size > 1000) {
        size /= 1000;
        unit++;
    }
    return `${size.toFixed(2)}${units[unit]}`
}
