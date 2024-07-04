export const beautify_log = {
    success: (...args: any[]) => {
        console.log('%c%s', 'color: green;border: 1px solid green;padding: 0 4px', 'success', ...args)
    },
    error: (...args: any[]) => {
        console.log('%c%s', 'color: red;border: 1px solid red;padding: 0 4px', 'error', ...args)
    },
    wanning: (...args: any[]) => {
        console.log('%c%s', 'color: orange;border: 1px solid orange;padding: 0 4px', 'wanning', ...args)
    },
    info: (...args: any[]) => {
        console.log('%c%s', 'color: blue;border: 1px solid blue;padding: 0 4px', 'info', ...args)
    },
    debug: (...args: any[]) => {
        console.log('%c%s', 'color: gray;border: 1px solid gray;padding: 0 4px', 'debug', ...args)
    }
}