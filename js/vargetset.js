/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
var __webpack_exports__ = {};

;// CONCATENATED MODULE: ../shared/client/src/helper.js
/**
 * Shared helper methods for cables uis
 */
class Helper
{
    constructor()
    {
        this._simpleIdCounter = 0;
    }

    /**
     * generate a random v4 uuid
     *
     * @return {string}
     */
    uuid()
    {
        let d = new Date().getTime();
        return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) =>
        {
            const r = (d + Math.random() * 16) % 16 | 0;
            d = Math.floor(d / 16);
            return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
        });
    }

    /**
     * checks value for !isNan and isFinite
     *
     * @param {string} n
     * @return {boolean}
     */
    isNumeric(n)
    {
        const nn = parseFloat(n);
        return !isNaN(nn) && isFinite(nn);
    }

    /**
     * generate a simple ID using an internal counter
     *
     * @return {Number} new id
     * @static
     */
    simpleId()
    {
        this._simpleIdCounter++;
        return this._simpleIdCounter;
    }

}
/* harmony default export */ const helper = (new Helper());

;// CONCATENATED MODULE: ../shared/client/src/logger.js
/* eslint-disable no-console */

class Logger
{

    /**
     * @param {any} initiator
     * @param {Object} options
     */
    constructor(initiator, options)
    {
        this.initiator = initiator;
        this._options = options;
    }

    stack(t)
    {
        console.info("[" + this.initiator + "] ", t);
        console.log((new Error()).stack);
    }

    groupCollapsed(t)
    {
        if ((CABLES.UI && CABLES.UI.logFilter.filterLog({ "initiator": this.initiator, "level": 0 }, ...arguments)) || !CABLES.logSilent) console.log("[" + this.initiator + "]", ...arguments);

        console.groupCollapsed("[" + this.initiator + "] " + t);
    }

    table(t)
    {
        console.table(t);
    }

    groupEnd()
    {
        console.groupEnd();
    }

    error()
    {
        if ((CABLES.UI && CABLES.UI.logFilter.filterLog({ "initiator": this.initiator, "level": 2 }, ...arguments)) || !CABLES.UI)
        {
            console.error("[" + this.initiator + "]", ...arguments);
        }

        if (this._options && this._options.onError)
        {
            this._options.onError(this.initiator, ...arguments);
            // console.log("emitevent onerror...");
            // CABLES.patch.emitEvent("onError", this.initiator, ...arguments);
            // CABLES.logErrorConsole("[" + this.initiator + "]", ...arguments);
        }
    }

    errorGui()
    {
        if (CABLES.UI) CABLES.UI.logFilter.filterLog({ "initiator": this.initiator, "level": 2 }, ...arguments);
    }

    warn()
    {
        if ((CABLES.UI && CABLES.UI.logFilter.filterLog({ "initiator": this.initiator, "level": 1 }, ...arguments)) || !CABLES.logSilent)
            console.warn("[" + this.initiator + "]", ...arguments);
    }

    verbose()
    {
        if ((CABLES.UI && CABLES.UI.logFilter.filterLog({ "initiator": this.initiator, "level": 0 }, ...arguments)) || !CABLES.logSilent)
            console.log("[" + this.initiator + "]", ...arguments);
    }

    info()
    {
        if ((CABLES.UI && CABLES.UI.logFilter.filterLog({ "initiator": this.initiator, "level": 0 }, ...arguments)) || !CABLES.logSilent)
            console.info("[" + this.initiator + "]", ...arguments);
    }

    log()
    {
        if ((CABLES.UI && CABLES.UI.logFilter.filterLog({ "initiator": this.initiator, "level": 0 }, ...arguments)) || !CABLES.logSilent)
            console.log("[" + this.initiator + "]", ...arguments);
    }

    logGui()
    {
        if (CABLES.UI) CABLES.UI.logFilter.filterLog({ "initiator": this.initiator, "level": 0 }, ...arguments);
    }

    userInteraction(text)
    {
        // this.log({ "initiator": "userinteraction", "text": text });
    }
}

;// CONCATENATED MODULE: ../shared/client/src/eventtarget.js



/**
 * add eventlistener functionality to classes
 */
class Events
{
    #eventLog;
    constructor()
    {
        this.#eventLog = new Logger("eventtarget");
        this._eventCallbacks = {};
        this._logName = "";
        this._logEvents = false;
        this._listeners = {};

        this._countErrorUnknowns = 0;
    }

    /**
     * add event listener
     * @param {string} which event name
     * @param {function} cb callback
     * @param {string} idPrefix prefix for id, default empty
     * @return {string} event id
     */
    on(which, cb, idPrefix = "")
    {
        const event =
            {
                "id": (idPrefix || "") + helper.simpleId(),
                "name": which,
                "cb": cb,
            };
        if (!this._eventCallbacks[which]) this._eventCallbacks[which] = [event];
        else this._eventCallbacks[which].push(event);

        this._listeners[event.id] = event;

        return event.id;
    }

    /** @deprecated */
    addEventListener(which, cb, idPrefix = "")
    {
        return this.on(which, cb, idPrefix);
    }

    /**
     * check event listener registration
     * @param {string} id event id
     * @param {function} cb callback - deprecated
     * @return {boolean}
     */
    hasEventListener(id, cb = null)
    {
        if (id && !cb)
        {
            // check by id
            return !!this._listeners[id];
        }
        else
        {
            this.#eventLog.warn("old eventtarget function haseventlistener!");
            if (id && cb)
            {
                if (this._eventCallbacks[id])
                {
                    const idx = this._eventCallbacks[id].indexOf(cb);
                    return idx !== -1;
                }
            }
        }
    }

    /**
     * check event listener by name
     * @param eventName event name
     * @return {boolean}
     */
    hasListenerForEventName(eventName)
    {
        return this._eventCallbacks[eventName] && this._eventCallbacks[eventName].length > 0;
    }

    /** @deprecated */
    removeEventListener(id)
    {
        return this.off(id);
    }

    /**
     * remove event listener registration
     * @param {string} id event id
     * @return
     */
    off(id)
    {
        if (id === null || id === undefined)
        {
            this.#eventLog.warn("removeEventListener id null", id);
            return;
        }

        if (typeof id == "string") // new style, remove by id, not by name/callback
        {
            const event = this._listeners[id];
            if (!event)
            {
                if (this._countErrorUnknowns == 20) this.#eventLog.warn("stopped reporting unknown events");
                if (this._countErrorUnknowns < 20) this.#eventLog.warn("could not find event...", id);
                this._countErrorUnknowns++;
                return;
            }

            let removeCount = 0;

            let found = true;
            while (found)
            {
                found = false;
                let index = -1;
                for (let i = 0; i < this._eventCallbacks[event.name].length; i++)
                {
                    if (this._eventCallbacks[event.name][i].id.indexOf(id) === 0) // this._eventCallbacks[event.name][i].id == which ||
                    {
                        found = true;
                        index = i;
                    }
                }

                if (index !== -1)
                {
                    this._eventCallbacks[event.name].splice(index, 1);
                    delete this._listeners[id];
                    removeCount++;
                }
            }

            if (removeCount == 0)console.log("no events removed", event.name, id);

            return;
        }
        else
        {
            console.log("old function signature: removeEventListener! use listener id");
        }
    }

    /**
     * enable/disable logging of events for the class
     *
     * @param {boolean} enabled
     * @param {string} logName
     */
    logEvents(enabled, logName)
    {
        this._logEvents = enabled;
        this._logName = logName;
    }

    /**
     * emit event
     *
     * @param {string} which event name
     * @param {*} param1
     * @param {*} param2
     * @param {*} param3
     * @param {*} param4
     * @param {*} param5
     * @param {*} param6
     */
    emitEvent(which, param1 = null, param2 = null, param3 = null, param4 = null, param5 = null, param6 = null)
    {
        if (this._logEvents) this.#eventLog.log("[event] ", this._logName, which, this._eventCallbacks);

        if (this._eventCallbacks[which])
        {
            for (let i = 0; i < this._eventCallbacks[which].length; i++)
            {
                if (this._eventCallbacks[which][i])
                {
                    this._eventCallbacks[which][i].cb(param1, param2, param3, param4, param5, param6);
                }
            }
        }
        else
        {
            if (this._logEvents) this.#eventLog.log("[event] has no event callback", which, this._eventCallbacks);
        }
    }
}

;// CONCATENATED MODULE: ./src/core/extendjs.js
/**
 * extend javascript functionality
 */

/**
 * @external Math
 */

/**
 * set random seed for seededRandom()
 * @type Number
 * @static
 */
Math.randomSeed = 1;

/**
 * @function external:Math#setRandomSeed
 * @param {number} seed
 */
Math.setRandomSeed = function (seed)
{
    // https://github.com/cables-gl/cables_docs/issues/622
    Math.randomSeed = seed * 50728129;
    if (seed != 0)
    {
        Math.randomSeed = Math.seededRandom() * 17624813;
        Math.randomSeed = Math.seededRandom() * 9737333;
    }
};

/**
 * generate a seeded random number
 * @function seededRandom
 * @memberof Math
 * @param {Number} max minimum possible random number
 * @param {Number} min maximum possible random number
 * @return {Number} random value
 * @static
 */
Math.seededRandom = function (max, min)
{
    if (Math.randomSeed === 0) Math.randomSeed = Math.random() * 999;
    max = max || 1;
    min = min || 0;

    Math.randomSeed = (Math.randomSeed * 9301 + 49297) % 233280;
    const rnd = Math.randomSeed / 233280.0;

    return min + rnd * (max - min);
};

/**
     * @namespace String
     */

/**
 * append a linebreak to a string
 * @function endl
 * @extends String
 * @return {String} string with newline break appended ('\n')
 */
String.prototype.endl = function ()
{
    return this + "\n";
};

String.prototype.contains = function (str)
{
    console.warn("string.contains deprecated, use string.includes");
    console.log((new Error()).stack);
    return this.includes(str);

};

function extendJs()
{

}

;// CONCATENATED MODULE: ./src/core/utils.js
/**
 * @namespace external:CABLES#Utils
 */




extendJs();

/**
 * Merge two Float32Arrays.
 * @function float32Concat
 * @param {Float32Array} first Left-hand side array
 * @param {Float32Array} second Right-hand side array
 * @return {Float32Array}
 * @static
 */
function float32Concat(first, second)
{
    if (!(first instanceof Float32Array)) first = new Float32Array(first);
    if (!(second instanceof Float32Array)) second = new Float32Array(second);

    const result = new Float32Array(first.length + second.length);

    result.set(first);
    result.set(second, first.length);

    return result;
}

/**
 * get op shortname: only last part of fullname and without version
 * @function getShortOpName
 * @memberof CABLES
 * @param {string} fullname full op name
 * @static
 */
const getShortOpName = function (fullname)
{
    let name = fullname.split(".")[fullname.split(".").length - 1];

    if (name.includes(CONSTANTS.OP.OP_VERSION_PREFIX))
    {
        const n = name.split(CONSTANTS.OP.OP_VERSION_PREFIX)[1];
        name = name.substring(0, name.length - (CONSTANTS.OP.OP_VERSION_PREFIX + n).length);
    }
    return name;
};

/**
 * randomize order of an array
 * @function shuffleArray
 * @param {Array|Float32Array} array {Array} original
 * @return {Array|Float32Array} shuffled array
 * @static
 */
const shuffleArray = function (array)
{
    for (let i = array.length - 1; i > 0; i--)
    {
        const j = Math.floor(Math.seededRandom() * (i + 1));
        const temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
    return array;
};

/**
 * generate a short "relativly unique" id
 * @function shortId
 * @return {String} generated ID
 * @static
 */

const _shortIds = {};
const shortId = function ()
{
    let str = Math.random().toString(36).substr(2, 9);

    if (_shortIds.hasOwnProperty(str)) str = shortId();
    _shortIds[str] = true;
    return str;
};

/**
 * @typedef {String} UUID
*/

/**
 * generate a UUID
 * @function uuid
 * @return {UUID} generated UUID
 * @static
 */
const uuid = function ()
{
    let d = new Date().getTime();
    const uuidStr = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) =>
    {
        const r = (d + Math.random() * 16) % 16 | 0;
        d = Math.floor(d / 16);
        return (c == "x" ? r : (r & 0x3) | 0x8).toString(16);
    });
    return uuidStr;
};
const generateUUID = (/* unused pure expression or super */ null && (uuid));

function cleanJson(obj)
{
    for (const i in obj)
    {
        if (obj[i] && typeof objValue === "object" && obj[i].constructor === Object) obj[i] = cleanJson(obj[i]);

        if (obj[i] === null || obj[i] === undefined) delete obj[i];
        else if (Array.isArray(obj[i]) && obj[i].length == 0) delete obj[i];
    }

    return obj;
}

/**
 * @see http://stackoverflow.com/q/7616461/940217
 * @param {string} str
 * @param {string} prefix
 * @return {string}
 */
const prefixedHash = function (str, prefix = "id")
{
    let hash = 0;
    if (str.length > 0)
    {
        for (let i = 0; i < str.length; i++)
        {
            let character = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + character;
            hash &= hash; // Convert to 32bit integer
        }
    }
    return prefix + "" + hash;
};

/**
 * generate a simple ID
 * @function simpleId
 * @return {Number} new id
 * @static
 */
let simpleIdCounter = 0;
const simpleId = function ()
{
    simpleIdCounter++;
    return simpleIdCounter;
};

/**
 * smoothStep a value
 * @function smoothStep
 * @function
 * @param {Number} perc value value to be smoothed [0-1]
 * @return {Number} smoothed value
 * @static
 */
const smoothStep = function (perc)
{
    const x = Math.max(0, Math.min(1, (perc - 0) / (1 - 0)));
    perc = x * x * (3 - 2 * x); // smoothstep
    return perc;
};

/**
 * smootherstep a value
 * @function smootherStep
 * @param {Number} perc value to be smoothed [0-1]
 * @return {Number} smoothed value
 * @static
 */
const smootherStep = function (perc)
{
    const x = Math.max(0, Math.min(1, (perc - 0) / (1 - 0)));
    perc = x * x * x * (x * (x * 6 - 15) + 10); // smootherstep
    return perc;
};

/**
 * clamp number / make sure its between min/max
 * @function clamp
 * @param {Number} value value to be mapped
 * @param {Number} min minimum value
 * @param {Number} max maximum value
 * @static
 */
const clamp = function (value, min, max)
{
    return Math.min(Math.max(value, min), max);
};

/**
 * map a value in a range to a value in another range
 * @function map
 * @param {Number} x value to be mapped
 * @param {Number} _oldMin old range minimum value
 * @param {Number} _oldMax old range maximum value
 * @param {Number} _newMin new range minimum value
 * @param {Number} _newMax new range maximum value
 * @param {Number} _easing
 * @return {Number} mapped value
 * @static
 */
const map = function (x, _oldMin, _oldMax, _newMin, _newMax, _easing = 0)
{
    if (x >= _oldMax) return _newMax;
    if (x <= _oldMin) return _newMin;

    let reverseInput = false;
    const oldMin = Math.min(_oldMin, _oldMax);
    const oldMax = Math.max(_oldMin, _oldMax);
    if (oldMin != _oldMin) reverseInput = true;

    let reverseOutput = false;
    const newMin = Math.min(_newMin, _newMax);
    const newMax = Math.max(_newMin, _newMax);
    if (newMin != _newMin) reverseOutput = true;

    let portion = 0;
    let r = 0;

    if (reverseInput) portion = ((oldMax - x) * (newMax - newMin)) / (oldMax - oldMin);
    else portion = ((x - oldMin) * (newMax - newMin)) / (oldMax - oldMin);

    if (reverseOutput) r = newMax - portion;
    else r = portion + newMin;

    if (!_easing) return r;
    if (_easing == 1)
    {
        // smoothstep
        x = Math.max(0, Math.min(1, (r - _newMin) / (_newMax - _newMin)));
        return _newMin + x * x * (3 - 2 * x) * (_newMax - _newMin);
    }
    if (_easing == 2)
    {
        // smootherstep
        x = Math.max(0, Math.min(1, (r - _newMin) / (_newMax - _newMin)));
        return _newMin + x * x * x * (x * (x * 6 - 15) + 10) * (_newMax - _newMin);
    }

    return r;
};

// ----------------------------------------------------------------

/**
 * returns true if parameter is a number
 * @function isNumeric
 * @param {Any} n value The value to check.
 * @return {Boolean}
 * @static
 */
function isNumeric(n)
{
    return !isNaN(parseFloat(n)) && isFinite(n);
}

/**
 * returns true if parameter is array
 * @function isArray
 * @param {any} v value Value to check
 * @return {Boolean}
 * @static
 */
function isArray(v)
{
    return Object.prototype.toString.call(v) === "[object Array]";
}

// ----------------------------------------------------------------

/**
 * append a unique/random parameter to a url, so the browser is forced to reload the file, even if its cached
 * @function cacheBust
 * @static
 * @param {String} url The url to append the cachebuster parameter to.
 * @return {String} url with cachebuster parameter
 */
const cacheBust = function (url = "")
{
    if (!url) return "";
    if (url.startsWith("data:")) return;
    if (url.includes("?")) url += "&";
    else url += "?";
    return url + "cache=" + CABLES.uuid();
};

/**
 * copy the content of an array
 * @function copyArray
 * @static
 * @param {Array} src sourceArray
 * @param {Array} dst optional
 * @return {Array} dst
 */
const copyArray = function (src, dst)
{
    if (!src) return null;
    dst = dst || [];
    dst.length = src.length;
    for (let i = 0; i < src.length; i++)
        dst[i] = src[i];

    return dst;
};

/**
 * return the filename part of a url without extension
 * @function basename
 * @static
 * @param {String} url
 * @return {String} just the filename
 */
const basename = function (url)
{
    let name = CABLES.filename(url);

    const parts2 = name.split(".");
    name = parts2[0];

    return name;
};

/**
 * output a stacktrace to the console
 * @function logStack
 * @static
 */
const logStack = function ()
{
    console.log("logstack", (new Error()).stack);
};

/**
 * return the filename part of a url
 * @function filename
 * @static
 * @param {String} url
 * @return {String} just the filename
 */
const filename = function (url)
{
    let name = "";
    if (!url) return "";

    if (url.startsWith("data:") && url.includes(":"))
    {
        const parts = url.split(",");
        return parts[0];
    }

    let parts = (url + "").split("/");
    if (parts.length > 0)
    {
        const str = parts[parts.length - 1];
        let parts2 = str.split("?");
        name = parts2[0];
    }

    return name || "";
};

const ajaxSync = function (url, cb, method, post, contenttype)
{
    request({
        "url": url,
        "cb": cb,
        "method": method,
        "data": post,
        "contenttype": contenttype,
        "sync": true,
    });
};

/**
 * make an ajax request
 * @static
 * @function ajax
 * @param url
 * @param cb
 * @param method
 * @param post
 * @param contenttype
 * @param jsonP
 * @param headers
 * @param options
 */
const ajax = function (url, cb, method, post, contenttype, jsonP, headers = {}, options = {})
{
    const requestOptions = {
        "url": url,
        "cb": cb,
        "method": method,
        "data": post,
        "contenttype": contenttype,
        "sync": false,
        "jsonP": jsonP,
        "headers": headers,
    };
    if (options && options.credentials) requestOptions.credentials = options.credentials;
    request(requestOptions);
};

const request = function (options)
{
    if (!options.hasOwnProperty("asynch")) options.asynch = true;

    let xhr;
    try
    {
        xhr = new XMLHttpRequest();
    }
    catch (e) {}

    xhr.onreadystatechange = function ()
    {
        if (xhr.readyState != 4) return;

        if (options.cb)
        {
            if (xhr.status == 200 || xhr.status == 0) options.cb(false, xhr.responseText, xhr);
            else options.cb(true, xhr.responseText, xhr);
        }
    };

    try
    {
        xhr.open(options.method ? options.method.toUpperCase() : "GET", options.url, !options.sync);
    }
    catch (e)
    {
        if (options.cb && e) options.cb(true, e.msg, xhr);
    }

    if (typeof options.headers === "object")
    {
        if (options.headers)
        {
            const keys = Object.keys(options.headers);
            for (let i = 0; i < keys.length; i++)
            {
                const name = keys[i];
                const value = options.headers[name];
                xhr.setRequestHeader(name, value);
            }
        }
    }

    if (options.credentials && options.credentials !== "omit")
    {
        xhr.withCredentials = true;
    }

    try
    {
        if (!options.post && !options.data)
        {
            xhr.send();
        }
        else
        {
            xhr.setRequestHeader(
                "Content-type",
                options.contenttype ? options.contenttype : "application/x-www-form-urlencoded",
            );
            xhr.send(options.data || options.post);
        }
    }
    catch (e)
    {
        if (options.cb) options.cb(true, e.msg, xhr);
    }
};

// ----------------------------------------------------------------

const logErrorConsole = function (initiator)
{
    CABLES.errorConsole = CABLES.errorConsole || { "log": [] };
    CABLES.errorConsole.log.push({ "initiator": initiator, "arguments": arguments });

    if (!CABLES.errorConsole.ele)
    {
        const ele = document.createElement("div");
        ele.id = "cablesErrorConsole";
        ele.style.width = "90%";
        ele.style.height = "300px";
        ele.style.zIndex = "9999999";
        ele.style.display = "inline-block";
        ele.style.position = "absolute";
        ele.style.padding = "10px";
        ele.style.fontFamily = "monospace";
        ele.style.color = "red";
        ele.style.backgroundColor = "#200";

        CABLES.errorConsole.ele = ele;
        document.body.appendChild(ele);
    }

    let logHtml = "ERROR<br/>for more info, open your browsers dev tools console (Ctrl+Shift+I or Command+Alt+I)<br/>";

    for (let l = 0; l < CABLES.errorConsole.log.length; l++)
    {
        logHtml += CABLES.errorConsole.log[l].initiator + " ";
        for (let i = 1; i < CABLES.errorConsole.log[l].arguments.length; i++)
        {
            if (i > 2)logHtml += ", ";
            let arg = CABLES.errorConsole.log[l].arguments[i];
            if (arg.constructor.name.indexOf("Error") > -1 || arg.constructor.name.indexOf("error") > -1)
            {
                let txt = "Uncaught ErrorEvent ";
                if (arg.message)txt += " message: " + arg.message;
                logHtml += txt;
            }
            else if (typeof arg == "string")
                logHtml += arg;
            else if (typeof arg == "number")
                logHtml += String(arg) + " ";
        }
        logHtml += "<br/>";
    }

    CABLES.errorConsole.ele.innerHTML = logHtml;
};

/**
 * @param {Array<any>} arr
 */
function uniqueArray(arr)
{
    const u = {}, a = [];
    for (let i = 0, l = arr.length; i < l; ++i)
    {
        if (!u.hasOwnProperty(arr[i]))
        {
            a.push(arr[i]);
            u[arr[i]] = 1;
        }
    }
    return a;
}

;// CONCATENATED MODULE: ./src/core/anim_key.js


class AnimKey
{
    constructor(obj, an)
    {
        this.id = CABLES.shortId();
        this.time = 0.0;
        this.value = 0.0;
        this.selected = false;

        this.anim = obj.anim || an || null;

        // this.ui = null;
        this.onChange = null;
        this._easing = 0;
        // this.bezTangIn = 0;
        // this.bezTangOut = 0;
        // this.bezTime = 0.5;
        // this.bezValue = 0;
        // this.bezTimeIn = -0.5;
        // this.bezValueIn = 0;

        this.cb = null;
        this.cbTriggered = false;

        // const bezierAnim = null;
        // this._updateBezier = false;

        this.setEasing(Anim.EASING_LINEAR);
        this.set(obj);
    }

    delete()
    {
        if (this.anim) this.anim.remove(this);
        else console.log("animkey without anim...");
    }

    setEasing(e)
    {
        this._easing = e;

        if (this._easing == Anim.EASING_LINEAR) this.ease = AnimKey.easeLinear;
        else if (this._easing == Anim.EASING_ABSOLUTE) this.ease = AnimKey.easeAbsolute;
        else if (this._easing == Anim.EASING_SMOOTHSTEP) this.ease = AnimKey.easeSmoothStep;
        else if (this._easing == Anim.EASING_SMOOTHERSTEP) this.ease = AnimKey.easeSmootherStep;
        else if (this._easing == Anim.EASING_CUBIC_IN) this.ease = AnimKey.easeCubicIn;
        else if (this._easing == Anim.EASING_CUBIC_OUT) this.ease = AnimKey.easeCubicOut;
        else if (this._easing == Anim.EASING_CUBIC_INOUT) this.ease = AnimKey.easeCubicInOut;
        else if (this._easing == Anim.EASING_EXPO_IN) this.ease = AnimKey.easeExpoIn;
        else if (this._easing == Anim.EASING_EXPO_OUT) this.ease = AnimKey.easeExpoOut;
        else if (this._easing == Anim.EASING_EXPO_INOUT) this.ease = AnimKey.easeExpoInOut;
        else if (this._easing == Anim.EASING_SIN_IN) this.ease = AnimKey.easeSinIn;
        else if (this._easing == Anim.EASING_SIN_OUT) this.ease = AnimKey.easeSinOut;
        else if (this._easing == Anim.EASING_SIN_INOUT) this.ease = AnimKey.easeSinInOut;
        else if (this._easing == Anim.EASING_BACK_OUT) this.ease = AnimKey.easeOutBack;
        else if (this._easing == Anim.EASING_BACK_IN) this.ease = AnimKey.easeInBack;
        else if (this._easing == Anim.EASING_BACK_INOUT) this.ease = AnimKey.easeInOutBack;
        else if (this._easing == Anim.EASING_ELASTIC_IN) this.ease = AnimKey.easeInElastic;
        else if (this._easing == Anim.EASING_ELASTIC_OUT) this.ease = AnimKey.easeOutElastic;
        // else if (this._easing == Anim.EASING_ELASTIC_INOUT) this.ease = AnimKey.easeElasticInOut;
        else if (this._easing == Anim.EASING_BOUNCE_IN) this.ease = AnimKey.easeInBounce;
        else if (this._easing == Anim.EASING_BOUNCE_OUT) this.ease = AnimKey.easeOutBounce;
        else if (this._easing == Anim.EASING_QUART_OUT) this.ease = AnimKey.easeOutQuart;
        else if (this._easing == Anim.EASING_QUART_IN) this.ease = AnimKey.easeInQuart;
        else if (this._easing == Anim.EASING_QUART_INOUT) this.ease = AnimKey.easeInOutQuart;
        else if (this._easing == Anim.EASING_QUINT_OUT) this.ease = AnimKey.easeOutQuint;
        else if (this._easing == Anim.EASING_QUINT_IN) this.ease = AnimKey.easeInQuint;
        else if (this._easing == Anim.EASING_QUINT_INOUT) this.ease = AnimKey.easeInOutQuint;
        else if (this._easing == Anim.EASING_CUBICSPLINE)
        {
        // this._updateBezier = true;
            this.ease = AnimKey.easeCubicSpline;
        }
        else
        {
            this._easing = Anim.EASING_LINEAR;
            this.ease = AnimKey.easeLinear;
        }
    }

    trigger()
    {
        this.cb();
        this.cbTriggered = true;
    }

    setValue(v)
    {
        this.value = v;
        if (this.onChange !== null) this.onChange();
    }

    set(obj)
    {
        if (obj)
        {
            if (obj.e) this.setEasing(obj.e);
            if (obj.cb)
            {
                this.cb = obj.cb;
                this.cbTriggered = false;
            }

            if (obj.b)
            {
            // this.bezTime = obj.b[0];
            // this.bezValue = obj.b[1];
            // this.bezTimeIn = obj.b[2];
            // this.bezValueIn = obj.b[3];
            // this._updateBezier = true;
            }

            if (obj.hasOwnProperty("t")) this.time = obj.t;
            if (obj.hasOwnProperty("time")) this.time = obj.time;
            if (obj.hasOwnProperty("v")) this.value = obj.v;
            else if (obj.hasOwnProperty("value")) this.value = obj.value;
        }
        if (this.onChange !== null) this.onChange();
    }

    /**
     * @returns {Object}
     */
    getSerialized()
    {
        const obj = {};
        obj.t = this.time;
        obj.v = this.value;
        obj.e = this._easing;

        return obj;
    }

    getEasing()
    {
        return this._easing;
    }
}

AnimKey.cubicSpline = function (perc, key1, key2)
{
    let
        previousPoint = key1.value,
        previousTangent = key1.bezTangOut,
        nextPoint = key2.value,
        nextTangent = key2.bezTangIn;
    let t = perc;
    let t2 = t * t;
    let t3 = t2 * t;

    return (2 * t3 - 3 * t2 + 1) * previousPoint + (t3 - 2 * t2 + t) * previousTangent + (-2 * t3 + 3 * t2) * nextPoint + (t3 - t2) * nextTangent;
};

AnimKey.easeCubicSpline = function (perc, key2)
{
    return AnimKey.cubicSpline(perc, this, key2);
};

AnimKey.linear = function (perc, key1, key2)
{
    return parseFloat(key1.value) + parseFloat(key2.value - key1.value) * perc;
};

AnimKey.easeLinear = function (perc, key2)
{
    return AnimKey.linear(perc, this, key2);
};

AnimKey.easeAbsolute = function (perc, key2)
{
    return this.value;
};

const easeExpoIn = function (t)
{
    return (t = 2 ** (10 * (t - 1)));
};

AnimKey.easeExpoIn = function (t, key2)
{
    t = easeExpoIn(t);
    return AnimKey.linear(t, this, key2);
};

const easeExpoOut = function (t)
{
    t = -(2 ** (-10 * t)) + 1;
    return t;
};

AnimKey.easeExpoOut = function (t, key2)
{
    t = easeExpoOut(t);
    return AnimKey.linear(t, this, key2);
};

const easeExpoInOut = function (t)
{
    t *= 2;
    if (t < 1)
    {
        t = 0.5 * 2 ** (10 * (t - 1));
    }
    else
    {
        t--;
        t = 0.5 * (-(2 ** (-10 * t)) + 2);
    }
    return t;
};

AnimKey.easeExpoInOut = function (t, key2)
{
    t = easeExpoInOut(t);
    return AnimKey.linear(t, this, key2);
};

AnimKey.easeSinIn = function (t, key2)
{
    t = -1 * Math.cos((t * Math.PI) / 2) + 1;
    return AnimKey.linear(t, this, key2);
};

AnimKey.easeSinOut = function (t, key2)
{
    t = Math.sin((t * Math.PI) / 2);
    return AnimKey.linear(t, this, key2);
};

AnimKey.easeSinInOut = function (t, key2)
{
    t = -0.5 * (Math.cos(Math.PI * t) - 1.0);
    return AnimKey.linear(t, this, key2);
};

const easeCubicIn = function (t)
{
    t = t * t * t;
    return t;
};

AnimKey.easeCubicIn = function (t, key2)
{
    t = easeCubicIn(t);
    return AnimKey.linear(t, this, key2);
};

// b 0
// c 1/2 or 1
// d always 1
// easeOutCubic: function (x, t, b, c, d) {
//     return c*((t=t/d-1)*t*t + 1) + b;

AnimKey.easeInQuint = function (t, key2)
{
    t = t * t * t * t * t;
    return AnimKey.linear(t, this, key2);
};
AnimKey.easeOutQuint = function (t, key2)
{
    t = (t -= 1) * t * t * t * t + 1;
    return AnimKey.linear(t, this, key2);
};
AnimKey.easeInOutQuint = function (t, key2)
{
    if ((t /= 0.5) < 1) t = 0.5 * t * t * t * t * t;
    else t = 0.5 * ((t -= 2) * t * t * t * t + 2);
    return AnimKey.linear(t, this, key2);
};

AnimKey.easeInQuart = function (t, key2)
{
    t = t * t * t * t;
    return AnimKey.linear(t, this, key2);
};

AnimKey.easeOutQuart = function (t, key2)
{
    // return -c * ((t=t/d-1)*t*t*t - 1) + b;
    t = -1 * ((t -= 1) * t * t * t - 1);
    return AnimKey.linear(t, this, key2);
};

AnimKey.easeInOutQuart = function (t, key2)
{
    if ((t /= 0.5) < 1) t = 0.5 * t * t * t * t;
    else t = -0.5 * ((t -= 2) * t * t * t - 2);
    return AnimKey.linear(t, this, key2);
};

AnimKey.bounce = function (t)
{
    if ((t /= 1) < 1 / 2.75) t = 7.5625 * t * t;
    else if (t < 2 / 2.75) t = 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
    else if (t < 2.5 / 2.75) t = 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
    else t = 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
    return t;
};

AnimKey.easeInBounce = function (t, key2)
{
    return AnimKey.linear(AnimKey.bounce(t), this, key2);
    // return c - jQuery.easing.easeOutBounce (x, d-t, 0, c, d);
};

AnimKey.easeOutBounce = function (t, key2)
{
    return AnimKey.linear(AnimKey.bounce(t), this, key2);
};

AnimKey.easeInElastic = function (t, key2)
{
    let s = 1.70158;
    let p = 0;
    let a = 1;

    const b = 0;
    const d = 1;
    const c = 1;

    if (t === 0) t = b;
    else if ((t /= d) == 1) t = b + c;
    else
    {
        if (!p) p = d * 0.3;
        if (a < Math.abs(c))
        {
            a = c;
            s = p / 4;
        }
        else s = (p / (2 * Math.PI)) * Math.asin(c / a);
        t = -(a * 2 ** (10 * (t -= 1)) * Math.sin(((t * d - s) * (2 * Math.PI)) / p)) + b;
    }

    return AnimKey.linear(t, this, key2);
};

AnimKey.easeOutElastic = function (t, key2)
{
    let s = 1.70158;
    let p = 0;
    let a = 1;

    const b = 0;
    const d = 1;
    const c = 1;

    if (t === 0) t = b;
    else if ((t /= d) == 1) t = b + c;
    else
    {
        if (!p) p = d * 0.3;
        if (a < Math.abs(c))
        {
            a = c;
            s = p / 4;
        }
        else s = (p / (2 * Math.PI)) * Math.asin(c / a);
        t = a * 2 ** (-10 * t) * Math.sin(((t * d - s) * (2 * Math.PI)) / p) + c + b;
    }

    return AnimKey.linear(t, this, key2);
};

AnimKey.easeInBack = function (t, key2)
{
    const s = 1.70158;
    t = t * t * ((s + 1) * t - s);

    return AnimKey.linear(t, this, key2);
};

AnimKey.easeOutBack = function (t, key2)
{
    const s = 1.70158;
    t = (t = t / 1 - 1) * t * ((s + 1) * t + s) + 1;

    return AnimKey.linear(t, this, key2);
};

AnimKey.easeInOutBack = function (t, key2)
{
    let s = 1.70158;
    const c = 1 / 2;
    if ((t /= 1 / 2) < 1) t = c * (t * t * (((s *= 1.525) + 1) * t - s));
    else t = c * ((t -= 2) * t * (((s *= 1.525) + 1) * t + s) + 2);

    return AnimKey.linear(t, this, key2);
};

const easeCubicOut = function (t)
{
    t--;
    t = t * t * t + 1;
    return t;
};

AnimKey.easeCubicOut = function (t, key2)
{
    t = easeCubicOut(t);
    return AnimKey.linear(t, this, key2);
};

const easeCubicInOut = function (t)
{
    t *= 2;
    if (t < 1) t = 0.5 * t * t * t;
    else
    {
        t -= 2;
        t = 0.5 * (t * t * t + 2);
    }
    return t;
};

AnimKey.easeCubicInOut = function (t, key2)
{
    t = easeCubicInOut(t);
    return AnimKey.linear(t, this, key2);
};

AnimKey.easeSmoothStep = function (perc, key2)
{
    // var x = Math.max(0, Math.min(1, (perc-0)/(1-0)));
    const x = Math.max(0, Math.min(1, perc));
    perc = x * x * (3 - 2 * x); // smoothstep
    return AnimKey.linear(perc, this, key2);
};

AnimKey.easeSmootherStep = function (perc, key2)
{
    const x = Math.max(0, Math.min(1, (perc - 0) / (1 - 0)));
    perc = x * x * x * (x * (x * 6 - 15) + 10); // smootherstep
    return AnimKey.linear(perc, this, key2);
};

;// CONCATENATED MODULE: ./src/core/anim.js






/**
 * configuration object for loading a patch
 * @typedef {Object} AnimCfg
 * @property {number} [defaultEasing] use easing index as default
 * @property {string} [name] anim name
 */

/**
 * Keyframed interpolated animation.
 *
 * @class
 * @param cfg
 * @example
 * var anim=new CABLES.Anim();
 * anim.setValue(0,0);  // set value 0 at 0 seconds
 * anim.setValue(10,1); // set value 1 at 10 seconds
 * anim.getValue(5);    // get value at 5 seconds - this returns 0.5
 */

class Anim extends Events
{
    static EASING_LINEAR = 0;
    static EASING_ABSOLUTE = 1;
    static EASING_SMOOTHSTEP = 2;
    static EASING_SMOOTHERSTEP = 3;
    static EASING_CUBICSPLINE = 4;

    static EASING_CUBIC_IN = 5;
    static EASING_CUBIC_OUT = 6;
    static EASING_CUBIC_INOUT = 7;

    static EASING_EXPO_IN = 8;
    static EASING_EXPO_OUT = 9;
    static EASING_EXPO_INOUT = 10;

    static EASING_SIN_IN = 11;
    static EASING_SIN_OUT = 12;
    static EASING_SIN_INOUT = 13;

    static EASING_BACK_IN = 14;
    static EASING_BACK_OUT = 15;
    static EASING_BACK_INOUT = 16;

    static EASING_ELASTIC_IN = 17;
    static EASING_ELASTIC_OUT = 18;

    static EASING_BOUNCE_IN = 19;
    static EASING_BOUNCE_OUT = 21;

    static EASING_QUART_IN = 22;
    static EASING_QUART_OUT = 23;
    static EASING_QUART_INOUT = 24;

    static EASING_QUINT_IN = 25;
    static EASING_QUINT_OUT = 26;
    static EASING_QUINT_INOUT = 27;

    static EASINGNAMES = ["linear", "absolute", "smoothstep", "smootherstep", "Cubic In", "Cubic Out", "Cubic In Out", "Expo In", "Expo Out", "Expo In Out", "Sin In", "Sin Out", "Sin In Out", "Quart In", "Quart Out", "Quart In Out", "Quint In", "Quint Out", "Quint In Out", "Back In", "Back Out", "Back In Out", "Elastic In", "Elastic Out", "Bounce In", "Bounce Out"];

    /**
     * @param {AnimCfg} cfg
     */
    constructor(cfg)
    {
        super();
        cfg = cfg || {};
        this.id = uuid();
        this.keys = [];
        this.onChange = null;
        this.stayInTimeline = false;
        this.loop = false;
        this._log = new Logger("Anim");
        this._lastKeyIndex = 0;
        this._cachedIndex = 0;
        this.name = cfg.name || null;

        /**
         * @type {Number}
         */
        this.defaultEasing = cfg.defaultEasing || Anim.EASING_LINEAR;
        this.onLooped = null;

        this._timesLooped = 0;
        this._needsSort = false;
    }

    forceChangeCallback()
    {
        if (this.onChange !== null) this.onChange();
        this.emitEvent("onChange", this);
    }

    getLoop()
    {
        return this.loop;
    }

    setLoop(target)
    {
        this.loop = target;
        this.emitEvent("onChange", this);
    }

    /**
     * returns true if animation has ended at @time
     * checks if last key time is < time
     * @param {Number} time
     * @returns {Boolean}
     * @memberof Anim
     * @instance
     * @function
     */
    hasEnded(time)
    {
        if (this.keys.length === 0) return true;
        if (this.keys[this._lastKeyIndex].time <= time) return true;
        return false;
    }

    /**
     * @param {number} time
     */
    isRising(time)
    {
        if (this.hasEnded(time)) return false;
        const ki = this.getKeyIndex(time);
        if (this.keys[ki].value < this.keys[ki + 1].value) return true;
        return false;
    }

    /**
     * remove all keys from animation before time
     * @param {Number} time
     * @memberof Anim
     * @instance
     * @function
     */
    clearBefore(time)
    {
        const v = this.getValue(time);
        const ki = this.getKeyIndex(time);

        this.setValue(time, v);

        if (ki > 1) this.keys.splice(0, ki);
        this._updateLastIndex();
    }

    /**
     * remove all keys from animation
     * @param {Number} [time=0] set a new key at time with the old value at time
     * @memberof Anim
     * @instance
     * @function
     */
    clear(time)
    {
        let v = 0;
        if (time) v = this.getValue(time);
        this.keys.length = 0;
        this._updateLastIndex();
        if (time) this.setValue(time, v);
        if (this.onChange !== null) this.onChange();
        this.emitEvent("onChange", this);
    }

    sortKeys()
    {
        this.keys.sort((a, b) => { return parseFloat(a.time) - parseFloat(b.time); });
        this._updateLastIndex();
        this._needsSort = false;
        if (this.keys.length > 999 && this.keys.length % 1000 == 0)console.log(this.name, this.keys.length);
    }

    hasDuplicates()
    {
        const test = {};
        let count = 0;
        for (let i = 0; i < this.keys.length; i++)
        {
            test[this.keys[i].time] = 1;
            count++;
        }

        const keys = Object.keys(test);
        if (keys.length != count)
        {
            return true;
        }
        return false;
    }

    removeDuplicates()
    {
        if (this.hasDuplicates())
        {
            this.sortKeys();
            let count = 0;

            while (this.hasDuplicates())
            {
                for (let i = 0; i < this.keys.length - 1; i++)
                {
                    if (this.keys[i].time == this.keys[i + 1].time) this.keys.splice(i, 1);
                    count++;
                }
            }
            this._updateLastIndex();
        }
    }

    getLength()
    {
        if (this.keys.length === 0) return 0;
        return this.keys[this.keys.length - 1].time;
    }

    /**
     * @param {number} time
     */
    getKeyIndex(time)
    {
        let index = 0;
        let start = 0;
        if (this._cachedIndex && this.keys.length > this._cachedIndex && time >= this.keys[this._cachedIndex].time) start = this._cachedIndex;
        for (let i = start; i < this.keys.length; i++)
        {
            if (time >= this.keys[i].time) index = i;
            if (this.keys[i].time > time)
            {
                if (time != 0) this._cachedIndex = index;
                return index;
            }
        }

        return index;
    }

    /**
     * set value at time
     * @function setValue
     * @memberof Anim
     * @instance
     * @param {Number} time
     * @param {Number} value
     * @param {Function} cb callback
     */
    setValue(time, value, cb = null)
    {
        let found = null;

        if (this.keys.length == 0 || time <= this.keys[this.keys.length - 1].time)
            for (let i = 0; i < this.keys.length; i++)
                if (this.keys[i].time == time)
                {
                    found = this.keys[i];
                    this.keys[i].setValue(value);
                    this.keys[i].cb = cb;
                    break;
                }

        if (!found)
        {
            found = new AnimKey(
                {
                    "time": time,
                    "value": value,
                    "e": this.defaultEasing,
                    "cb": cb,
                    "anim": this
                });
            this.keys.push(found);

            // if (this.keys.length % 1000 == 0)console.log(this.name, this.keys.length);
            this._updateLastIndex();
        }

        if (this.onChange) this.onChange();
        this.emitEvent("onChange", this);
        this._needsSort = true;
        return found;
    }

    /**
     * @param {number} index
     * @param {number} easing
     */
    setKeyEasing(index, easing)
    {
        if (this.keys[index])
        {
            this.keys[index].setEasing(easing);
            this.emitEvent("onChange", this);
        }
    }

    /**
     * @returns {Object}
     */
    getSerialized()
    {
        const obj = {};
        obj.keys = [];
        obj.loop = this.loop;

        for (let i = 0; i < this.keys.length; i++)
            obj.keys.push(this.keys[i].getSerialized());

        return obj;
    }

    /**
     * @param {number} time
     */
    getKey(time)
    {
        const index = this.getKeyIndex(time);
        return this.keys[index];
    }

    /**
     * @param {number} time
     */
    getNextKey(time)
    {
        let index = this.getKeyIndex(time) + 1;
        if (index >= this.keys.length) index = this.keys.length - 1;

        return this.keys[index];
    }

    /**
     * @param {number} time
     */
    isFinished(time)
    {
        if (this.keys.length <= 0) return true;
        return time > this.keys[this.keys.length - 1].time;
    }

    /**
     * @param {number} time
     */
    isStarted(time)
    {
        if (this.keys.length <= 0) return false;
        return time >= this.keys[0].time;
    }

    /**
     * @param {AnimKey} k
     */
    remove(k)
    {
        for (let i = 0; i < this.keys.length; i++)
        {
            if (this.keys[i] == k)
            {
                this.keys.splice(i, 1);
                this._updateLastIndex();
                return;
            }
        }
        console.log("key remove not found", k);
    }

    /**
     * get value at time
     * @function getValue
     * @memberof Anim
     * @instance
     * @param {Number} [time] time
     * @returns {Number} interpolated value at time
     */
    getValue(time)
    {
        if (this.keys.length === 0)
        {
            return 0;
        }
        if (this._needsSort) this.sortKeys();

        if (!this.loop && time > this.keys[this._lastKeyIndex].time)
        {
            if (this.keys[this._lastKeyIndex].cb && !this.keys[this._lastKeyIndex].cbTriggered) this.keys[this._lastKeyIndex].trigger();

            return this.keys[this._lastKeyIndex].value;
        }

        if (time < this.keys[0].time)
        {
            return this.keys[0].value;
        }

        if (this.loop && time > this.keys[this._lastKeyIndex].time)
        {
            const currentLoop = time / this.keys[this._lastKeyIndex].time;
            if (currentLoop > this._timesLooped)
            {
                this._timesLooped++;
                if (this.onLooped) this.onLooped();
            }
            time = (time - this.keys[0].time) % (this.keys[this._lastKeyIndex].time - this.keys[0].time);
            time += this.keys[0].time;
        }

        const index = this.getKeyIndex(time);
        if (index >= this._lastKeyIndex)
        {
            if (this.keys[this._lastKeyIndex].cb && !this.keys[this._lastKeyIndex].cbTriggered) this.keys[this._lastKeyIndex].trigger();

            return this.keys[this._lastKeyIndex].value;
        }

        const index2 = index + 1;
        const key1 = this.keys[index];
        const key2 = this.keys[index2];

        if (key1.cb && !key1.cbTriggered) key1.trigger();

        if (!key2) return -1;

        const perc = (time - key1.time) / (key2.time - key1.time);

        return key1.ease(perc, key2);
    }

    _updateLastIndex()
    {
        this._lastKeyIndex = this.keys.length - 1;
    }

    /**
     * @param {AnimKey} k
     */
    addKey(k)
    {
        if (k.time === undefined)
        {
            this._log.warn("key time undefined, ignoring!");
        }
        else
        {
            this.keys.push(k);
            if (this.onChange !== null) this.onChange();
            this.emitEvent("onChange", this);
            this._needsSort = true;
        }
        this._updateLastIndex();
    }

    /**
     * @param {string} str
     */
    easingFromString(str)
    {
        // todo smarter way to map ?
        if (str == "linear") return Anim.EASING_LINEAR;
        if (str == "absolute") return Anim.EASING_ABSOLUTE;
        if (str == "smoothstep") return Anim.EASING_SMOOTHSTEP;
        if (str == "smootherstep") return Anim.EASING_SMOOTHERSTEP;

        if (str == "Cubic In") return Anim.EASING_CUBIC_IN;
        if (str == "Cubic Out") return Anim.EASING_CUBIC_OUT;
        if (str == "Cubic In Out") return Anim.EASING_CUBIC_INOUT;

        if (str == "Expo In") return Anim.EASING_EXPO_IN;
        if (str == "Expo Out") return Anim.EASING_EXPO_OUT;
        if (str == "Expo In Out") return Anim.EASING_EXPO_INOUT;

        if (str == "Sin In") return Anim.EASING_SIN_IN;
        if (str == "Sin Out") return Anim.EASING_SIN_OUT;
        if (str == "Sin In Out") return Anim.EASING_SIN_INOUT;

        if (str == "Back In") return Anim.EASING_BACK_IN;
        if (str == "Back Out") return Anim.EASING_BACK_OUT;
        if (str == "Back In Out") return Anim.EASING_BACK_INOUT;

        if (str == "Elastic In") return Anim.EASING_ELASTIC_IN;
        if (str == "Elastic Out") return Anim.EASING_ELASTIC_OUT;

        if (str == "Bounce In") return Anim.EASING_BOUNCE_IN;
        if (str == "Bounce Out") return Anim.EASING_BOUNCE_OUT;

        if (str == "Quart Out") return Anim.EASING_QUART_OUT;
        if (str == "Quart In") return Anim.EASING_QUART_IN;
        if (str == "Quart In Out") return Anim.EASING_QUART_INOUT;

        if (str == "Quint Out") return Anim.EASING_QUINT_OUT;
        if (str == "Quint In") return Anim.EASING_QUINT_IN;
        if (str == "Quint In Out") return Anim.EASING_QUINT_INOUT;

        console.log("unknown anim easing?", str);
    }

    /**
     * @param {Op} op
     * @param {string} title
     * @param {function} cb
     * @returns {Port}
     */
    createPort(op, title, cb)
    {
        const port = op.inDropDown(title, Anim.EASINGNAMES, "linear");
        port.set("linear");
        port.defaultValue = "linear";

        port.onChange = () =>
        {
            this.defaultEasing = this.easingFromString(port.get());
            this.emitEvent("onChangeDefaultEasing", this);

            if (cb) cb();
        };

        return port;
    }
}

// ------------------------------

/**
 * @param {number} time
 * @param {number} q
 * @param {number} animx
 * @param {number} animy
 * @param {number} animz
 * @param {number} animw
 */
Anim.slerpQuaternion = function (time, q, animx, animy, animz, animw)
{
    if (!Anim.slerpQuaternion.q1)
    {
        Anim.slerpQuaternion.q1 = quat.create();
        Anim.slerpQuaternion.q2 = quat.create();
    }

    const i1 = animx.getKeyIndex(time);
    let i2 = i1 + 1;
    if (i2 >= animx.keys.length) i2 = animx.keys.length - 1;

    if (i1 == i2)
    {
        quat.set(q, animx.keys[i1].value, animy.keys[i1].value, animz.keys[i1].value, animw.keys[i1].value);
    }
    else
    {
        const key1Time = animx.keys[i1].time;
        const key2Time = animx.keys[i2].time;
        const perc = (time - key1Time) / (key2Time - key1Time);

        quat.set(Anim.slerpQuaternion.q1, animx.keys[i1].value, animy.keys[i1].value, animz.keys[i1].value, animw.keys[i1].value);

        quat.set(Anim.slerpQuaternion.q2, animx.keys[i2].value, animy.keys[i2].value, animz.keys[i2].value, animw.keys[i2].value);

        quat.slerp(q, Anim.slerpQuaternion.q1, Anim.slerpQuaternion.q2, perc);
    }
    return q;
};

;// CONCATENATED MODULE: ./src/core/constants.js


const constants_CONSTANTS = {
    "ANIM": {
        "EASINGS": Anim.EASINGNAMES,
        "EASING_LINEAR": 0,
        "EASING_ABSOLUTE": 1,
        "EASING_SMOOTHSTEP": 2,
        "EASING_SMOOTHERSTEP": 3,
        "EASING_CUBICSPLINE": 4,

        "EASING_CUBIC_IN": 5,
        "EASING_CUBIC_OUT": 6,
        "EASING_CUBIC_INOUT": 7,

        "EASING_EXPO_IN": 8,
        "EASING_EXPO_OUT": 9,
        "EASING_EXPO_INOUT": 10,

        "EASING_SIN_IN": 11,
        "EASING_SIN_OUT": 12,
        "EASING_SIN_INOUT": 13,

        "EASING_BACK_IN": 14,
        "EASING_BACK_OUT": 15,
        "EASING_BACK_INOUT": 16,

        "EASING_ELASTIC_IN": 17,
        "EASING_ELASTIC_OUT": 18,

        "EASING_BOUNCE_IN": 19,
        "EASING_BOUNCE_OUT": 21,

        "EASING_QUART_IN": 22,
        "EASING_QUART_OUT": 23,
        "EASING_QUART_INOUT": 24,

        "EASING_QUINT_IN": 25,
        "EASING_QUINT_OUT": 26,
        "EASING_QUINT_INOUT": 27,
    },

    "OP": {
        "OP_PORT_TYPE_VALUE": 0,
        "OP_PORT_TYPE_NUMBER": 0,
        "OP_PORT_TYPE_FUNCTION": 1,
        "OP_PORT_TYPE_TRIGGER": 1,
        "OP_PORT_TYPE_OBJECT": 2,
        "OP_PORT_TYPE_TEXTURE": 2,
        "OP_PORT_TYPE_ARRAY": 3,
        "OP_PORT_TYPE_DYNAMIC": 4,
        "OP_PORT_TYPE_STRING": 5,

        "OP_VERSION_PREFIX": "_v",
    },

    "PORT": {
        "PORT_DIR_IN": 0,
        "PORT_DIR_OUT": 1,
    },

    "PACO": {
        "PACO_CLEAR": 0,
        "PACO_VALUECHANGE": 1,
        "PACO_OP_DELETE": 2,
        "PACO_UNLINK": 3,
        "PACO_LINK": 4,
        "PACO_LOAD": 5,
        "PACO_OP_CREATE": 6,
        "PACO_OP_ENABLE": 7,
        "PACO_OP_DISABLE": 8,
        "PACO_UIATTRIBS": 9,
        "PACO_VARIABLES": 10,
        "PACO_TRIGGERS": 11,
        "PACO_PORT_SETVARIABLE": 12,
        "PACO_PORT_SETANIMATED": 13,
        "PACO_PORT_ANIM_UPDATED": 14,
        "PACO_DESERIALIZE": 15,
        "PACO_OP_RELOAD": 16
    },
};

;// CONCATENATED MODULE: ./src/libs/cables/vargetset.js


const VarSetOpWrapper = class
{
    constructor(op, type, valuePort, varNamePort, triggerPort, nextPort)
    {
        this._valuePort = valuePort;
        this._varNamePort = varNamePort;
        this._op = op;
        this._type = type;
        this._typeId = -1;
        this._triggerPort = triggerPort;
        this._nextPort = nextPort;

        this._btnCreate = op.inTriggerButton("Create new variable");
        this._btnCreate.setUiAttribs({ "hidePort": true });
        this._btnCreate.onTriggered = this._createVar.bind(this);

        this._helper = op.inUiTriggerButtons("", ["Rename"]);
        this._helper.setUiAttribs({ "hidePort": true });
        this._helper.onTriggered = (which) => { if (which == "Rename") CABLES.CMD.PATCH.renameVariable(op.varName.get()); };

        this._op.setPortGroup("Variable", [this._helper, this._varNamePort, this._btnCreate]);

        varNamePort.setUiAttribs({ "_variableSelect": true });
        this._op.on("uiParamPanel", this._updateVarNamesDropdown.bind(this));

        // this._op.patch.addEventListener("variableDeleted", this._updateVarNamesDropdown.bind(this));
        this._op.patch.addEventListener("variablesChanged", this._updateName.bind(this));
        this._op.patch.addEventListener("variableRename", this._renameVar.bind(this));

        this._varNamePort.onChange = this._updateName.bind(this);

        this._isTexture = this._valuePort.uiAttribs.objType === "texture";

        this._valuePort.changeAlways = true;

        if (this._triggerPort)
        {
            this._triggerPort.onTriggered = () =>
            {
                this._setVarValue(true);
            };
        }
        else
        {
            this._valuePort.onChange = this._setVarValue.bind(this);
        }


        this._op.init = () =>
        {
            this._updateName();
            if (!this._triggerPort) this._setVarValue();
            this._updateErrorUi();
        };

        if (type == "array") this._typeId = constants_CONSTANTS.OP.OP_PORT_TYPE_ARRAY;
        else if (type == "object") this._typeId = constants_CONSTANTS.OP.OP_PORT_TYPE_OBJECT;
        else if (type == "string") this._typeId = constants_CONSTANTS.OP.OP_PORT_TYPE_STRING;
        else if (type == "texture") this._typeId = constants_CONSTANTS.OP.OP_PORT_TYPE_TEXTURE;
        else this._typeId = constants_CONSTANTS.OP.OP_PORT_TYPE_VALUE;
    }

    _updateErrorUi()
    {
        if (CABLES.UI)
        {
            if (!this._varNamePort.get()) this._op.setUiError("novarname", "no variable selected");
            else
            {
                if (this._op.hasUiErrors)
                    this._op.setUiError("novarname", null);
            }
        }
    }

    _updateName()
    {
        const varname = this._varNamePort.get();
        this._op.setTitle("var set");
        this._op.setUiAttrib({ "extendTitle": "#" + varname });

        this._updateErrorUi();

        const vari = this._op.patch.getVar(varname);
        if (vari && !vari.type) vari.type = this._type;

        if (!this._op.patch.hasVar(varname) && varname != 0 && !this._triggerPort)
        {
            this._setVarValue(); // this should not be done!!!, its kept because of compatibility anxiety
        }
        if (!this._op.patch.hasVar(varname) && varname != 0 && this._triggerPort)
        {
            if (this._type == "string") this._op.patch.setVarValue(varname, "");
            else if (this._type == "number") this._op.patch.setVarValue(varname, "");
            else this._op.patch.setVarValue(varname, null);
        }

        if (this._op.isCurrentUiOp())
        {
            this._updateVarNamesDropdown();
            this._op.refreshParams();
        }
        this._updateDisplay();
        this._op.patch.emitEvent("opVariableNameChanged", this._op, this._varNamePort.get());
    }

    _createVar()
    {
        CABLES.CMD.PATCH.createVariable(this._op, this._type, () => { this._updateName(); });
    }

    _updateDisplay()
    {
        this._valuePort.setUiAttribs({ "greyout": !this._varNamePort.get() });
    }

    _updateVarNamesDropdown()
    {
        if (CABLES.UI && CABLES.UI.loaded && CABLES.UI.loaded)
        {
            const perf = gui.uiProfiler.start("[vars] _updateVarNamesDropdown");

            const varnames = [];
            const vars = this._op.patch.getVars();
            for (const i in vars) if (vars[i].type == this._type && i != "0") varnames.push(i);
            this._varNamePort.uiAttribs.values = varnames;

            perf.finish();
        }
    }

    _renameVar(oldname, newname)
    {
        if (oldname != this._varNamePort.get()) return;
        this._varNamePort.set(newname);
        this._updateName();
    }

    _setVarValue(triggered)
    {
        const name = this._varNamePort.get();

        if (!name) return;

        const v = this._valuePort.get();

        if (this._typeId == constants_CONSTANTS.OP.OP_PORT_TYPE_VALUE || this._typeId == constants_CONSTANTS.OP.OP_PORT_TYPE_STRING)
        {
            this._op.patch.setVarValue(name, v);
        }
        else
        if (this._typeId == constants_CONSTANTS.OP.OP_PORT_TYPE_ARRAY)
        {
            this._arr = [];
            CABLES.copyArray(v, this._arr);
            // this._op.patch.setVarValue(name, null);
            this._op.patch.setVarValue(name, this._arr);
        }
        else
        {
            if (this._typeId == constants_CONSTANTS.OP.OP_PORT_TYPE_OBJECT)
            {
                if (this._isTexture)
                    this._op.patch.setVarValue(name, CGL.Texture.getEmptyTexture(this._op.patch.cgl));
                else
                    this._op.patch.setVarValue(name, null);

                if (v && v.tex && v._cgl && !this._isTexture) this._op.setUiError("texobj", "Dont use object variables for textures, use varSetTexture");
                else this._op.setUiError("texobj", null);
            }
            this._op.patch.setVarValue(name, v);
        }

        if (triggered && this._nextPort) this._nextPort.trigger();
    }
};

const VarGetOpWrapper = class
{
    constructor(op, type, varnamePort, valueOutPort)
    {
        this._op = op;
        this._type = type;
        this._varnamePort = varnamePort;
        this._variable = null;
        this._valueOutPort = valueOutPort;
        this._listenerId = null;

        this._op.on("uiParamPanel", this._updateVarNamesDropdown.bind(this));
        this._op.on("uiErrorChange", this._updateTitle.bind(this));

        this._op.patch.on("variableRename", this._renameVar.bind(this));
        this._op.patch.on("variableDeleted", (oldname) =>
        {
            if (this._op.isCurrentUiOp()) this._op.refreshParams();
        });

        varnamePort.setUiAttribs({ "_variableSelect": true });
        varnamePort.setUiAttribs({ "_variableSelectGet": true });

        this._varnamePort.onChange = this._changeVar.bind(this);
        this._op.patch.addEventListener("variablesChanged", this._init.bind(this));

        this._op.onDelete = () =>
        {
            if (this._variable && this._listenerId) this._variable.off(this._listenerId);
        };

        this._op.init = () =>
        {
            this._init();
        };
    }

    get variable()
    {
        return this._variable;
    }

    _changeVar()
    {
        if (this._variable && this._listenerId)
        {
            this._variable.off(this._listenerId);
        }
        this._init();
    }

    _renameVar(oldname, newname)
    {
        if (oldname != this._varnamePort.get()) return;
        this._varnamePort.set(newname);
        this._updateVarNamesDropdown();
        this._updateTitle();
        this._listenerId = this._variable.on("change", this._setValueOut.bind(this));
    }

    _updateVarNamesDropdown()
    {
        if (CABLES.UI && CABLES.UI.loaded)
        {
            const varnames = [];
            const vars = this._op.patch.getVars();

            for (const i in vars)
                if (vars[i].type == this._type && i != "0")
                    varnames.push(i);

            this._op.varName.uiAttribs.values = varnames;
        }
    }

    _setValueOut(v)
    {
        if (this._valueOutPort)
            if (this._typeId == constants_CONSTANTS.OP.OP_PORT_TYPE_ARRAY && this._typeId == constants_CONSTANTS.OP.OP_PORT_TYPE_OBJECT)
                this._valueOutPort.setRef(v);
            else
                this._valueOutPort.set(v);
    }

    _updateTitle()
    {
        if (this._variable)
        {
            this._op.setUiError("unknownvar", null);
            this._op.setTitle("var get");
            this._op.setUiAttrib({ "extendTitle": "#" + this._varnamePort.get() });
            if (this._valueOutPort) this._valueOutPort.set(this._variable.getValue());
        }
        else
        {
            this._op.setUiError("unknownvar", "unknown variable! - there is no setVariable with this name (" + this._varnamePort.get() + ")");
            this._op.setUiAttrib({ "extendTitle": "#invalid" });
            if (this._valueOutPort) this._valueOutPort.set(0);
        }
    }

    _init()
    {
        this._updateVarNamesDropdown();

        if (this._variable && this._listenerId) this._variable.off(this._listenerId);
        this._variable = this._op.patch.getVar(this._op.varName.get());
        if (this._variable) this._listenerId = this._variable.on("change", this._setValueOut.bind(this));

        this._updateTitle();

        this._op.patch.emitEvent("opVariableNameChanged", this._op, this._varnamePort.get());
    }
};

CABLES.VarSetOpWrapper = VarSetOpWrapper;
CABLES.VarGetOpWrapper = VarGetOpWrapper;

((this.CABLES = this.CABLES || {}).COREMODULES = this.CABLES.COREMODULES || {}).Vargetset = __webpack_exports__.Cables;
/******/ })()
;