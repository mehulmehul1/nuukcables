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

;// CONCATENATED MODULE: ./src/libs/cables/ammoworld.js
// https://stackoverflow.com/questions/12251199/re-positioning-a-rigid-body-in-bullet-physics
// https://github.com/InfiniteLee/ammo-debug-drawer


const AmmoWorld = class extends Events
{
    constructor()
    {
        super();
        this.world = null;
        this.bodies = [];
        this._countIndex = 1;
        this._bodymeta = {};
        this.lastTime = performance.now();
        this._collisions = [];
        this.autoRemove = true;

        this.setupWorld();
    }

    setupWorld()
    {
        this.collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
        this.dispatcher = new Ammo.btCollisionDispatcher(this.collisionConfiguration);
        this.overlappingPairCache = new Ammo.btDbvtBroadphase();
        this.solver = new Ammo.btSequentialImpulseConstraintSolver();

        this.world = new Ammo.btDiscreteDynamicsWorld(this.dispatcher, this.overlappingPairCache, this.solver, this.collisionConfiguration);

        this.world.setGravity(new Ammo.btVector3(0, -9, 0));
    }

    getListBodies()
    {
        const arr = [];
        for (let i in this._bodymeta)
        {
            arr.push(this._bodymeta[i]);
        }
        return arr;
    }

    dispose()
    {
        if (!this.world) return;

        this.emitEvent("dispose");

        for (let i = 0; i < this.bodies.length; i++)
        {
            if (this.bodies[i])
            {
                this.world.removeRigidBody(this.bodies[i]);
                Ammo.destroy(this.bodies[i]);
            }
        }
        this.bodies = [];

        Ammo.destroy(this.world);
        this.world = null;
        Ammo.destroy(this.collisionConfiguration);
        Ammo.destroy(this.dispatcher);
        Ammo.destroy(this.overlappingPairCache);
        Ammo.destroy(this.solver);
    }

    removeRigidBody(b)
    {
        const idx = this.bodies.indexOf(b);
        const metaIdx = b.getUserIndex();
        if (this.world && b)
            this.world.removeRigidBody(b);

        if (idx > -1) this.bodies.splice(idx, 1);

        delete this._bodymeta[metaIdx];
    }

    createRigidBody()
    {

    }

    addRigidBody(body)
    {
        if (!this.world) return;
        body.setUserIndex(++this._countIndex);
        this.world.addRigidBody(body);
        this.bodies.push(body);
    }

    setBodyMeta(body, meta)
    {
        if (body.getUserIndex() == 0)body.setUserIndex(++this._countIndex);
        meta.body = body;
        this._bodymeta[body.getUserIndex()] = meta;
    }

    getBodyMeta(body)
    {
        if (body) return this._bodymeta[body.getUserIndex()];
    }

    pingBody(body)
    {
        const m = this._bodymeta[body.getUserIndex()];
        if (m) m.ping = Math.round(performance.now());
    }

    getBodyByName(n)
    {
        for (let i in this._bodymeta)
        {
            if (this._bodymeta[i].name == n)
            {
                // console.log("found name", i);
                return this._bodymeta[i].body;
            }
        }
    }

    numBodies()
    {
        return this.bodies.length;
    }

    _pingTimeout()
    {
        for (let i in this._bodymeta)
        {
            const b = this._bodymeta[i];
            if (b.ping && performance.now() - b.ping > 50)
            {
                b.removed = true;
                this.removeRigidBody(b.body);
                // console.log("ping timeout", b);
            }
        }
    }

    frame()
    {
        if (!this.world) return;
        let deltaTime = performance.now() - this.lastTime;

        this.world.stepSimulation(deltaTime, 5);

        if (this.autoRemove) this._pingTimeout();
        this._checkCollisions();

        this.lastTime = performance.now();
    }

    activateAllBodies()
    {
        for (let i = 0; i < this.bodies.length; i++)
        {
            this.bodies[i].activate();
        }
    }

    getCollisions()
    {
        return this._collisions;
    }

    _checkCollisions()
    {
        let numManifolds = this.dispatcher.getNumManifolds();

        this._collisions.length = 0;
        for (let i = 0; i < numManifolds; i++)
        {
            let contactManifold = this.dispatcher.getManifoldByIndexInternal(i);
            let numContacts = contactManifold.getNumContacts();

            for (let j = 0; j < numContacts; j++)
            {
                let meta0 = this.getBodyMeta(contactManifold.getBody0());
                let meta1 = this.getBodyMeta(contactManifold.getBody1());

                if (meta0 && meta1)
                {
                    this._collisions.push({
                        "name0": meta0.name,
                        "name1": meta1.name
                    });
                }
            }
        }
    }
};

AmmoWorld._getGeomTriangle = function (geom, i)
{
    const arr = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    if (geom.verticesIndices && geom.verticesIndices.length)
    {
        const i3 = i * 3;
        const i13 = (i + 1) * 3;
        const i23 = (i + 2) * 3;
        arr[0] = geom.vertices[geom.verticesIndices[i3] * 3 + 0];
        arr[1] = geom.vertices[geom.verticesIndices[i3] * 3 + 1];
        arr[2] = geom.vertices[geom.verticesIndices[i3] * 3 + 2];

        arr[3] = geom.vertices[geom.verticesIndices[i13] * 3 + 0];
        arr[4] = geom.vertices[geom.verticesIndices[i13] * 3 + 1];
        arr[5] = geom.vertices[geom.verticesIndices[i13] * 3 + 2];

        arr[6] = geom.vertices[geom.verticesIndices[i23] * 3 + 0];
        arr[7] = geom.vertices[geom.verticesIndices[i23] * 3 + 1];
        arr[8] = geom.vertices[geom.verticesIndices[i23] * 3 + 2];
    }
    else
    {
        arr[0] = geom.vertices[i * 9 + 0];
        arr[1] = geom.vertices[i * 9 + 1];
        arr[2] = geom.vertices[i * 9 + 2];

        arr[3] = geom.vertices[i * 9 + 3];
        arr[4] = geom.vertices[i * 9 + 4];
        arr[5] = geom.vertices[i * 9 + 5];

        arr[6] = geom.vertices[i * 9 + 6];
        arr[7] = geom.vertices[i * 9 + 7];
        arr[8] = geom.vertices[i * 9 + 8];
    }

    return arr;
};

AmmoWorld.createConvexHullFromGeom = function (geom, numTris, scale)
{
    scale = scale || [1, 1, 1];
    const colShape = new Ammo.btConvexHullShape();
    const _vec3_1 = new Ammo.btVector3(0, 0, 0);
    const _vec3_2 = new Ammo.btVector3(0, 0, 0);
    const _vec3_3 = new Ammo.btVector3(0, 0, 0);

    let step = 1;

    if (geom.vertices.length / 3 > numTris && numTris > 0)
    {
        step = Math.floor(geom.vertices.length / 3 / numTris);
    }

    for (let i = 0; i < geom.vertices.length / 3; i += step)
    {
        _vec3_1.setX(geom.vertices[i * 3 + 0] * scale[0]);
        _vec3_1.setY(geom.vertices[i * 3 + 1] * scale[1]);
        _vec3_1.setZ(geom.vertices[i * 3 + 2] * scale[2]);
        colShape.addPoint(_vec3_1, true); // todo: only set true on last vertex
    }

    colShape.initializePolyhedralFeatures();

    // Ammo.destroy(_vec3_1);
    // Ammo.destroy(_vec3_2);
    // Ammo.destroy(_vec3_3);

    return colShape;
};


AmmoWorld.copyCglTransform = function (cgl, transform)
{
    const btOrigin = new Ammo.btVector3(0, 0, 0);
    const btQuat = new Ammo.btQuaternion(0, 0, 0, 1);

    const tmpOrigin = vec3.create();
    const tmpQuat = quat.create();

    mat4.getTranslation(tmpOrigin, cgl.mMatrix);
    mat4.getRotation(tmpQuat, cgl.mMatrix);

    btOrigin.setValue(tmpOrigin[0], tmpOrigin[1], tmpOrigin[2]);
    btQuat.setValue(tmpQuat[0], tmpQuat[1], tmpQuat[2], tmpQuat[3]);

    transform.setOrigin(btOrigin);
    transform.setRotation(btQuat);

    Ammo.destroy(btOrigin);
    Ammo.destroy(btQuat);
};

CABLES.AmmoWorld = AmmoWorld;

((this.CABLES = this.CABLES || {}).COREMODULES = this.CABLES.COREMODULES || {}).Ammoworld = __webpack_exports__.Cables;
/******/ })()
;