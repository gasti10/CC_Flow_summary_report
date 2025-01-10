const GLOBALS = {
    charts: {},
    apiBaseUrl: `https://script.google.com/macros/s/AKfycby0imLlKjegWFr29LKgHWEa4RdaApP7Au8h2i3jdcrvH6GuBbyVmuhKjP898Bq4tvuf/exec`,
    data: {}
};

window.GLOBALS = GLOBALS;

document.dispatchEvent(new CustomEvent('globalsReady'));