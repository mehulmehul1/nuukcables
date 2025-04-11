"use strict";

var CABLES=CABLES||{};
CABLES.OPS=CABLES.OPS||{};

var Ops=Ops || {};
Ops.Gl=Ops.Gl || {};
Ops.Ui=Ops.Ui || {};
Ops.Html=Ops.Html || {};
Ops.Math=Ops.Math || {};
Ops.Vars=Ops.Vars || {};
Ops.Gl.Pbr=Ops.Gl.Pbr || {};
Ops.Devices=Ops.Devices || {};
Ops.Gl.GLTF=Ops.Gl.GLTF || {};
Ops.Sidebar=Ops.Sidebar || {};
Ops.Trigger=Ops.Trigger || {};
Ops.Html.CSS=Ops.Html.CSS || {};
Ops.Extension=Ops.Extension || {};
Ops.Gl.Matrix=Ops.Gl.Matrix || {};
Ops.Gl.Meshes=Ops.Gl.Meshes || {};
Ops.Html.Elements=Ops.Html.Elements || {};
Ops.Devices.Keyboard=Ops.Devices.Keyboard || {};
Ops.Extension.AmmoPhysics=Ops.Extension.AmmoPhysics || {};



// **************************************************************
// 
// Ops.Gl.ClearColor
// 
// **************************************************************

Ops.Gl.ClearColor= class extends CABLES.Op 
{
constructor()
{
super(...arguments);
const op=this;
const attachments=op.attachments={};
const
    render = op.inTrigger("render"),
    trigger = op.outTrigger("trigger"),
    r = op.inFloatSlider("r", 0.1),
    g = op.inFloatSlider("g", 0.1),
    b = op.inFloatSlider("b", 0.1),
    a = op.inFloatSlider("a", 1);

r.setUiAttribs({ "colorPick": true });

const cgl = op.patch.cgl;

render.onTriggered = function ()
{
    cgl.gl.clearColor(r.get(), g.get(), b.get(), a.get());
    cgl.gl.clear(cgl.gl.COLOR_BUFFER_BIT | cgl.gl.DEPTH_BUFFER_BIT);
    trigger.trigger();
};

}
};

CABLES.OPS["19b441eb-9f63-4f35-ba08-b87841517c4d"]={f:Ops.Gl.ClearColor,objName:"Ops.Gl.ClearColor"};




// **************************************************************
// 
// Ops.Gl.BlendMode
// 
// **************************************************************

Ops.Gl.BlendMode= class extends CABLES.Op 
{
constructor()
{
super(...arguments);
const op=this;
const attachments=op.attachments={};
const
    exec = op.inTrigger("Render"),
    inBlend = op.inValueSelect("Blendmode", ["None", "Normal", "Add", "Subtract", "Multiply"], "Normal"),
    inPremul = op.inValueBool("Premultiplied"),
    next = op.outTrigger("Next");

const cgl = op.patch.cgl;
let blendMode = 0;
inBlend.onChange = update;
update();

function update()
{
    if (inBlend.get() == "Normal")blendMode = CGL.BLEND_NORMAL;
    else if (inBlend.get() == "Add")blendMode = CGL.BLEND_ADD;
    else if (inBlend.get() == "Subtract")blendMode = CGL.BLEND_SUB;
    else if (inBlend.get() == "Multiply")blendMode = CGL.BLEND_MUL;
    else blendMode = CGL.BLEND_NONE;

    if (CABLES.UI)
    {
        let blstr = "";
        if (inBlend.get() == "Normal")blstr = "";
        else if (inBlend.get() == "Add")blstr = "Add";
        else if (inBlend.get() == "Subtract")blstr = "Sub";
        else if (inBlend.get() == "Multiply")blstr = "Mul";
        else blstr = "None";

        op.setUiAttrib({ "extendTitle": blstr });
    }
}

exec.onTriggered = function ()
{
    cgl.pushBlendMode(blendMode, inPremul.get());
    cgl.pushBlend(blendMode != CGL.BLEND_NONE);
    next.trigger();
    cgl.popBlend();
    cgl.popBlendMode();
    cgl.gl.blendEquationSeparate(cgl.gl.FUNC_ADD, cgl.gl.FUNC_ADD);
    cgl.gl.blendFuncSeparate(cgl.gl.SRC_ALPHA, cgl.gl.ONE_MINUS_SRC_ALPHA, cgl.gl.ONE, cgl.gl.ONE_MINUS_SRC_ALPHA);
};

}
};

CABLES.OPS["ce0fff72-1438-4373-924f-e1d0f78b053f"]={f:Ops.Gl.BlendMode,objName:"Ops.Gl.BlendMode"};




// **************************************************************
// 
// Ops.Gl.MainLoop_v2
// 
// **************************************************************

Ops.Gl.MainLoop_v2= class extends CABLES.Op 
{
constructor()
{
super(...arguments);
const op=this;
const attachments=op.attachments={};
const
    hdpi = op.inFloat("Max Pixel Density (DPR)", 2),
    fpsLimit = op.inValue("FPS Limit", 0),
    reduceFocusFPS = op.inValueBool("Reduce FPS unfocussed", false),
    clear = op.inValueBool("Transparent", false),
    active = op.inValueBool("Active", 1),
    trigger = op.outTrigger("trigger"),
    width = op.outNumber("width"),
    height = op.outNumber("height"),
    outPixel = op.outNumber("Pixel Density");

op.onAnimFrame = render;
hdpi.onChange = updateHdpi;

const cgl = op.patch.cg = op.patch.cgl;
let rframes = 0;
let rframeStart = 0;
let timeOutTest = null;
let addedListener = false;
if (!op.patch.cgl) op.uiAttr({ "error": "No webgl cgl context" });

const identTranslate = vec3.create();
vec3.set(identTranslate, 0, 0, 0);
const identTranslateView = vec3.create();
vec3.set(identTranslateView, 0, 0, -2);

let fsElement = null;
let winhasFocus = true;
let winVisible = true;

window.addEventListener("blur", () => { winhasFocus = false; });
window.addEventListener("focus", () => { winhasFocus = true; });
document.addEventListener("visibilitychange", () => { winVisible = !document.hidden; });

testMultiMainloop();

op.patch.tempData.mainloopOp = this;

function updateHdpi()
{
    setPixelDensity();

    if (CABLES.UI)
    {
        if (hdpi.get() < 1)
            op.patch.cgl.canvas.style.imageRendering = "pixelated";
    }

    op.patch.cgl.updateSize();
    if (CABLES.UI) gui.setLayout();
}

active.onChange = function ()
{
    op.patch.removeOnAnimFrame(op);

    if (active.get())
    {
        op.setUiAttrib({ "extendTitle": "" });
        op.onAnimFrame = render;
        op.patch.addOnAnimFrame(op);
        op.log("adding again!");
    }
    else
    {
        op.setUiAttrib({ "extendTitle": "Inactive" });
    }
};

function getFpsLimit()
{
    if (reduceFocusFPS.get())
    {
        if (!winVisible) return 10;
        if (!winhasFocus) return 30;
    }

    return fpsLimit.get();
}

op.onDelete = function ()
{
    cgl.gl.clearColor(0, 0, 0.0, 0);
    cgl.gl.clear(cgl.gl.COLOR_BUFFER_BIT | cgl.gl.DEPTH_BUFFER_BIT);
};

function setPixelDensity()
{
    if (hdpi.get() != 0) op.patch.cgl.pixelDensity = Math.min(hdpi.get(), window.devicePixelRatio);
    else op.patch.cgl.pixelDensity = window.devicePixelRatio;
}

function render(time)
{
    if (!active.get()) return;
    if (cgl.aborted || cgl.canvas.clientWidth === 0 || cgl.canvas.clientHeight === 0) return;

    op.patch.cg = cgl;

    setPixelDensity();

    // if (hdpi.get())op.patch.cgl.pixelDensity = window.devicePixelRatio;

    const startTime = performance.now();

    op.patch.config.fpsLimit = getFpsLimit();

    if (cgl.canvasWidth == -1)
    {
        cgl.setCanvas(op.patch.config.glCanvasId);
        return;
    }

    if (cgl.canvasWidth != width.get() || cgl.canvasHeight != height.get())
    {
        width.set(cgl.canvasWidth / 1);
        height.set(cgl.canvasHeight / 1);
    }

    if (CABLES.now() - rframeStart > 1000)
    {
        CGL.fpsReport = CGL.fpsReport || [];
        if (op.patch.loading.getProgress() >= 1.0 && rframeStart !== 0)CGL.fpsReport.push(rframes);
        rframes = 0;
        rframeStart = CABLES.now();
    }
    CGL.MESH.lastShader = null;
    CGL.MESH.lastMesh = null;

    cgl.renderStart(cgl, identTranslate, identTranslateView);

    if (!clear.get()) cgl.gl.clearColor(0, 0, 0, 1);
    else cgl.gl.clearColor(0, 0, 0, 0);

    cgl.gl.clear(cgl.gl.COLOR_BUFFER_BIT | cgl.gl.DEPTH_BUFFER_BIT);

    trigger.trigger();

    if (CGL.MESH.lastMesh)CGL.MESH.lastMesh.unBind();

    if (CGL.Texture.previewTexture)
    {
        if (!CGL.Texture.texturePreviewer) CGL.Texture.texturePreviewer = new CGL.Texture.texturePreview(cgl);
        CGL.Texture.texturePreviewer.render(CGL.Texture.previewTexture);
    }
    cgl.renderEnd(cgl);

    op.patch.cg = null;

    if (!clear.get())
    {
        cgl.gl.clearColor(1, 1, 1, 1);
        cgl.gl.colorMask(false, false, false, true);
        cgl.gl.clear(cgl.gl.COLOR_BUFFER_BIT);
        cgl.gl.colorMask(true, true, true, true);
    }

    if (!cgl.tempData.phong)cgl.tempData.phong = {};
    rframes++;

    outPixel.set(op.patch.cgl.pixelDensity);
    op.patch.cgl.profileData.profileMainloopMs = performance.now() - startTime;
}

function testMultiMainloop()
{
    clearTimeout(timeOutTest);
    timeOutTest = setTimeout(
        () =>
        {
            if (op.patch.getOpsByObjName(op.name).length > 1)
            {
                op.setUiError("multimainloop", "there should only be one mainloop op!");
                if (!addedListener)addedListener = op.patch.addEventListener("onOpDelete", testMultiMainloop);
            }
            else op.setUiError("multimainloop", null, 1);
        }, 500);
}

}
};

CABLES.OPS["f1029550-d877-42da-9b1e-63a5163a0350"]={f:Ops.Gl.MainLoop_v2,objName:"Ops.Gl.MainLoop_v2"};




// **************************************************************
// 
// Ops.Vars.VarSetNumber_v2
// 
// **************************************************************

Ops.Vars.VarSetNumber_v2= class extends CABLES.Op 
{
constructor()
{
super(...arguments);
const op=this;
const attachments=op.attachments={};
const val = op.inValueFloat("Value", 0);
op.varName = op.inDropDown("Variable", [], "", true);

new CABLES.VarSetOpWrapper(op, "number", val, op.varName);

}
};

CABLES.OPS["b5249226-6095-4828-8a1c-080654e192fa"]={f:Ops.Vars.VarSetNumber_v2,objName:"Ops.Vars.VarSetNumber_v2"};




// **************************************************************
// 
// Ops.Gl.Perspective
// 
// **************************************************************

Ops.Gl.Perspective= class extends CABLES.Op 
{
constructor()
{
super(...arguments);
const op=this;
const attachments=op.attachments={};
const
    render = op.inTrigger("render"),
    inAxis = op.inSwitch("Axis", ["Vertical", "Horizontal"], "Vertical"),
    fovY = op.inValueFloat("fov y", 45),
    zNear = op.inValueFloat("frustum near", 0.1),
    zFar = op.inValueFloat("frustum far", 20),
    autoAspect = op.inValueBool("Auto Aspect Ratio", true),
    aspect = op.inValue("Aspect Ratio"),
    trigger = op.outTrigger("trigger"),
    outAsp = op.outNumber("Aspect");

fovY.onChange = zFar.onChange = zNear.onChange = changed;
fovY.setUiAttribs({ "title": "FOV Degrees" });

op.setPortGroup("Field of View", [fovY]);
op.setPortGroup("Frustrum", [zNear, zFar]);

let asp = 0;
let axis = 0;

changed();

inAxis.onChange = () =>
{
    axis = 0;
    if (inAxis.get() == "Horizontal")axis = 1;
};

render.onTriggered = function ()
{
    const cg = op.patch.cg;
    if (!cg) return;

    asp = cg.getViewPort()[2] / cg.getViewPort()[3];
    if (!autoAspect.get())asp = aspect.get();
    outAsp.set(asp);

    cg.pushPMatrix();

    if (axis == 0)
        mat4.perspective(cg.pMatrix, fovY.get() * 0.0174533, asp, zNear.get(), zFar.get());
    else
        perspectiveFovX(cg.pMatrix, fovY.get() * 0.0174533, asp, zNear.get(), zFar.get());

    trigger.trigger();

    cg.popPMatrix();
};

function changed()
{
    op.patch.cgl.tempData.perspective =
    {
        "fovy": fovY.get(),
        "zFar": zFar.get(),
        "zNear": zNear.get(),
    };
}

function perspectiveFovX(out, fovx, aspect, near, far)
{
    let nf;
    let f = 1 / (fovx) * 2;
    // Math.tan(1 / fovx * 2),
    // f=Math.max(0,f);

    out[0] = f;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = f / (1.0 / aspect);
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[11] = -1;
    out[12] = 0;
    out[13] = 0;
    out[15] = 0;

    if (far != null && far !== Infinity)
    {
        nf = 1 / (near - far);
        out[10] = (far + near) * nf;
        out[14] = 2 * far * near * nf;
    }
    else
    {
        out[10] = -1;
        out[14] = -2 * near;
    }
    return out;
}

}
};

CABLES.OPS["7a78e163-d28c-4f70-a6d0-6d952da79f50"]={f:Ops.Gl.Perspective,objName:"Ops.Gl.Perspective"};




// **************************************************************
// 
// Ops.Extension.AmmoPhysics.AmmoWorld
// 
// **************************************************************

Ops.Extension.AmmoPhysics.AmmoWorld= class extends CABLES.Op 
{
constructor()
{
super(...arguments);
const op=this;
const attachments=op.attachments={};
const
    inExec = op.inTrigger("Update"),
    inSim = op.inBool("Simulate", true),
    inAutoRemove = op.inBool("Auto Remove Inactive", true),

    inGravX = op.inFloat("Gravity X", 0),
    inGravY = op.inFloat("Gravity Y", -9.81),
    inGravZ = op.inFloat("Gravity Z", 0),

    inActivateAll = op.inTriggerButton("Activate All"),
    inReset = op.inTriggerButton("Reset"),

    next = op.outTrigger("next"),
    outNumBodies = op.outNumber("Total Bodies"),
    outPoints = op.outArray("debug points"),
    outBodiesMeta = op.outArray("Bodies Meta"),
    outCollisions = op.outArray("Collisions");

op.setPortGroup("Gravity", [inGravX, inGravZ, inGravY]);

inExec.onTriggered = update;

const cgl = op.patch.cgl;
let deltaTime, lastTime;
let ammoWorld = null;// new CABLES.AmmoWorld();
let loadingId = null;
let needsReset = true;
inReset.onTriggered = () =>
{
    needsReset = true;
};

inActivateAll.onTriggered = () =>
{
    if (ammoWorld) ammoWorld.activateAllBodies();
};

inGravX.onChange = inGravZ.onChange = inGravY.onChange = updateGravity;

function updateGravity()
{
    if (ammoWorld && ammoWorld.world)
        ammoWorld.world.setGravity(new Ammo.btVector3(inGravX.get(), inGravY.get(), inGravZ.get()));
}

function update()
{
    if (needsReset)
    {
        if (ammoWorld)ammoWorld.dispose();
        ammoWorld = null;
        needsReset = false;
    }

    if (!ammoWorld)
    {
        if (Ammo.cablesSetupDone)
        {
            ammoWorld = new CABLES.AmmoWorld();
            updateGravity();
            cgl.patch.loading.finished(loadingId);
            loadingId = null;
        }
        else
        {
            if (!loadingId) loadingId = cgl.patch.loading.start("ammoWorld", "ammoWASM", op);
            return;
        }
    }
    if (!ammoWorld.world) return;

    deltaTime = performance.now() - lastTime;

    if (inSim.get()) ammoWorld.frame();

    const old = cgl.frameStore.ammoWorld;
    cgl.frameStore.ammoWorld = ammoWorld;

    outNumBodies.set(ammoWorld.numBodies());
    outBodiesMeta.set(ammoWorld.getListBodies());
    outCollisions.set(ammoWorld.getCollisions());

    ammoWorld.autoRemove = inAutoRemove.get();

    next.trigger();

    lastTime = performance.now();
    cgl.frameStore.ammoWorld = old;
}

}
};

CABLES.OPS["1005fcd0-5f40-49c5-8d46-45e95fcecf37"]={f:Ops.Extension.AmmoPhysics.AmmoWorld,objName:"Ops.Extension.AmmoPhysics.AmmoWorld"};




// **************************************************************
// 
// Ops.Extension.AmmoPhysics.AmmoCharacterFpsCamera
// 
// **************************************************************

Ops.Extension.AmmoPhysics.AmmoCharacterFpsCamera= class extends CABLES.Op 
{
constructor()
{
super(...arguments);
const op=this;
const attachments=op.attachments={};
const
    render = op.inTrigger("render"),
    enablePointerLock = op.inBool("Enable pointer lock", true),
    trigger = op.outTrigger("trigger"),
    isLocked = op.outBoolNum("isLocked", false),
    inHeight = op.inFloat("Height", 2),
    inName = op.inString("Character Name", "player1"),
    mouseSpeed = op.inFloat("Mouse Speed", 1),
    inActive = op.inBool("Active", true),
    outMouseDown = op.outTrigger("Mouse Left"),
    outMouseDownRight = op.outTrigger("Mouse Right"),
    outDirX = op.outNumber("Dir X"),
    outDirY = op.outNumber("Dir Y"),
    outDirZ = op.outNumber("Dir Z"),
    outRotX = op.outNumber("Rot X"),
    outRotY = op.outNumber("Rot Y");

op.toWorkPortsNeedToBeLinked(render);

const cgl = op.patch.cgl;
const viewMatrix = mat4.create();
const vPos = vec3.create();
let speedx = 0, speedy = 0, speedz = 0;
const movementSpeedFactor = 0.5;
const canvas = cgl.canvas;
const DEG2RAD = 3.14159 / 180.0;
let rotX = 0;
let rotY = 0;
let lastMove = 0;
let mouseNoPL = { "firstMove": true,
    "deltaX": 0,
    "deltaY": 0,
};

initListener();

enablePointerLock.onChange = initListener;

inActive.onChange = () =>
{
    document.exitPointerLock();
    removeListener();

    lockChangeCallback();

    if (inActive.get()) initListener();
};

let tmpTrans = null;

render.onTriggered = function ()
{
    if (!Ammo) return;
    if (!inActive.get()) return trigger.trigger();
    if (!tmpTrans) tmpTrans = new Ammo.btTransform();

    if (cgl.frameStore.shadowPass) return trigger.trigger();

    cgl.pushViewMatrix();

    const ammoWorld = cgl.frameStore.ammoWorld;

    if (!ammoWorld)
    {
        op.log("char no ammoworld");
        return;
    }

    const body = ammoWorld.getBodyByName(inName.get());

    if (body)
    {
        let ms = body.getMotionState();
        ms.getWorldTransform(tmpTrans);
        let p = tmpTrans.getOrigin();
        vec3.set(vPos, -p.x(), -p.y() - inHeight.get(), -p.z());
    }
    else
    {
        op.log("char body not found!");
    }

    if (rotX < -90)rotX = -90;
    if (rotX > 90)rotX = 90;

    mat4.identity(cgl.vMatrix);

    mat4.rotateX(cgl.vMatrix, cgl.vMatrix, DEG2RAD * rotX);
    mat4.rotateY(cgl.vMatrix, cgl.vMatrix, DEG2RAD * rotY);

    mat4.translate(cgl.vMatrix, cgl.vMatrix, vPos);

    trigger.trigger();
    cgl.popViewMatrix();

    outRotX.set(rotX);
    outRotY.set(rotY);

    // for dir vec
    mat4.identity(viewMatrix);
    mat4.rotateX(viewMatrix, viewMatrix, DEG2RAD * rotX);
    mat4.rotateY(viewMatrix, viewMatrix, DEG2RAD * rotY);
    mat4.transpose(viewMatrix, viewMatrix);

    const dir = vec4.create();
    vec4.transformMat4(dir, [0, 0, 1, 1], viewMatrix);

    vec4.normalize(dir, dir);
    outDirX.set(-dir[0]);
    outDirY.set(-dir[1]);
    outDirZ.set(-dir[2]);
};

function moveCallback(e)
{
    const mouseSensitivity = 0.1;
    rotX += e.movementY * mouseSensitivity * mouseSpeed.get();
    rotY += e.movementX * mouseSensitivity * mouseSpeed.get();

    if (rotX < -90.0) rotX = -90.0;
    if (rotX > 90.0) rotX = 90.0;
    if (rotY < -180.0) rotY += 360.0;
    if (rotY > 180.0) rotY -= 360.0;
}

function mouseDown(e)
{
    if (e.which == 3) outMouseDownRight.trigger();
    else outMouseDown.trigger();
}

function lockChangeCallback(e)
{
    if (document.pointerLockElement === canvas ||
            document.mozPointerLockElement === canvas ||
            document.webkitPointerLockElement === canvas)
    {
        document.addEventListener("pointerdown", mouseDown, false);
        document.addEventListener("pointermove", moveCallback, false);
        isLocked.set(true);
    }
    else
    {
        document.removeEventListener("pointerdown", mouseDown, false);
        document.removeEventListener("pointermove", moveCallback, false);
        isLocked.set(false);
    }
}

function startPointerLock(e)
{
    const test = false;

    if (render.isLinked() && enablePointerLock.get() && e.buttons == 1)
    {
        document.addEventListener("pointermove", moveCallback, false);
        canvas.requestPointerLock = canvas.requestPointerLock ||
                                    canvas.mozRequestPointerLock ||
                                    canvas.webkitRequestPointerLock;
        canvas.requestPointerLock();
    }
}

function removeListener()
{
    cgl.canvas.removeEventListener("pointermove", moveCallbackNoPL, false);
    cgl.canvas.removeEventListener("pointerup", upCallbackNoPL, false);

    document.removeEventListener("pointerlockchange", lockChangeCallback, false);
    document.removeEventListener("mozpointerlockchange", lockChangeCallback, false);
    document.removeEventListener("webkitpointerlockchange", lockChangeCallback, false);
    cgl.canvas.removeEventListener("mousedown", startPointerLock);
}

function initListener()
{
    if (enablePointerLock.get())
    {
        document.addEventListener("pointerlockchange", lockChangeCallback, false);
        document.addEventListener("mozpointerlockchange", lockChangeCallback, false);
        document.addEventListener("webkitpointerlockchange", lockChangeCallback, false);
        cgl.canvas.addEventListener("mousedown", startPointerLock);

        cgl.canvas.removeEventListener("pointermove", moveCallbackNoPL, false);
        cgl.canvas.removeEventListener("pointerup", upCallbackNoPL, false);
    }
    else
    {
        cgl.canvas.addEventListener("pointermove", moveCallbackNoPL, false);
        cgl.canvas.addEventListener("pointerup", upCallbackNoPL, false);
    }
}

function upCallbackNoPL(e)
{
    try { cgl.canvas.releasePointerCapture(e.pointerId); }
    catch (e) {}
    mouseNoPL.firstMove = true;
}

function moveCallbackNoPL(e)
{
    if (e && e.buttons == 1)
    {
        try { cgl.canvas.setPointerCapture(e.pointerId); }
        catch (_e) {}

        if (!mouseNoPL.firstMove)
        {
            const deltaX = (e.clientX - mouseNoPL.lastX) * mouseSpeed.get() * 0.5;
            const deltaY = (e.clientY - mouseNoPL.lastY) * mouseSpeed.get() * 0.5;

            rotX += deltaY;
            rotY += deltaX;
        }

        mouseNoPL.firstMove = false;
        mouseNoPL.lastX = e.clientX;
        mouseNoPL.lastY = e.clientY;
    }
}

}
};

CABLES.OPS["0dca47aa-09e4-4b5d-b0d8-22390a950293"]={f:Ops.Extension.AmmoPhysics.AmmoCharacterFpsCamera,objName:"Ops.Extension.AmmoPhysics.AmmoCharacterFpsCamera"};




// **************************************************************
// 
// Ops.Trigger.Sequence
// 
// **************************************************************

Ops.Trigger.Sequence= class extends CABLES.Op 
{
constructor()
{
super(...arguments);
const op=this;
const attachments=op.attachments={};
const
    exe = op.inTrigger("exe"),
    cleanup = op.inTriggerButton("Clean up connections");

op.setUiAttrib({ "resizable": true, "resizableY": false, "stretchPorts": true });
const
    exes = [],
    triggers = [],
    num = 16;

let
    updateTimeout = null,
    connectedOuts = [];

exe.onTriggered = triggerAll;
cleanup.onTriggered = clean;
cleanup.setUiAttribs({ "hideParam": true, "hidePort": true });

for (let i = 0; i < num; i++)
{
    const p = op.outTrigger("trigger " + i);
    triggers.push(p);
    p.onLinkChanged = updateButton;

    if (i < num - 1)
    {
        let newExe = op.inTrigger("exe " + i);
        newExe.onTriggered = triggerAll;
        exes.push(newExe);
    }
}

updateConnected();

function updateConnected()
{
    connectedOuts.length = 0;
    for (let i = 0; i < triggers.length; i++)
        if (triggers[i].links.length > 0) connectedOuts.push(triggers[i]);
}

function updateButton()
{
    updateConnected();
    clearTimeout(updateTimeout);
    updateTimeout = setTimeout(() =>
    {
        let show = false;
        for (let i = 0; i < triggers.length; i++)
            if (triggers[i].links.length > 1) show = true;

        cleanup.setUiAttribs({ "hideParam": !show });

        if (op.isCurrentUiOp()) op.refreshParams();
    }, 60);
}

function triggerAll()
{
    // for (let i = 0; i < triggers.length; i++) triggers[i].trigger();
    for (let i = 0; i < connectedOuts.length; i++) connectedOuts[i].trigger();
}

function clean()
{
    let count = 0;
    for (let i = 0; i < triggers.length; i++)
    {
        let removeLinks = [];

        if (triggers[i].links.length > 1)
            for (let j = 1; j < triggers[i].links.length; j++)
            {
                while (triggers[count].links.length > 0) count++;

                removeLinks.push(triggers[i].links[j]);
                const otherPort = triggers[i].links[j].getOtherPort(triggers[i]);
                op.patch.link(op, "trigger " + count, otherPort.op, otherPort.name);
                count++;
            }

        for (let j = 0; j < removeLinks.length; j++) removeLinks[j].remove();
    }
    updateButton();
    updateConnected();
}

}
};

CABLES.OPS["a466bc1f-06e9-4595-8849-bffb9fe22f99"]={f:Ops.Trigger.Sequence,objName:"Ops.Trigger.Sequence"};




// **************************************************************
// 
// Ops.Gl.Pbr.PbrEnvironmentLight
// 
// **************************************************************

Ops.Gl.Pbr.PbrEnvironmentLight= class extends CABLES.Op 
{
constructor()
{
super(...arguments);
const op=this;
const attachments=op.attachments={"IBLLUT_frag":"precision highp float;\r\nprecision highp int;\r\nprecision highp sampler2D;\r\n\r\n#ifndef WEBGL1\r\n#define NUM_SAMPLES 1024u\r\n#else\r\n#define NUM_SAMPLES 1024\r\n#endif\r\n#define PI 3.14159265358\r\n\r\nIN vec3 P;\r\n{{MODULES_HEAD}}\r\n\r\n// from https://github.com/BabylonJS/Babylon.js/blob/5e6321d887637877d8b28b417410abbbeb651c6e/src/Shaders/ShadersInclude/hdrFilteringFunctions.fx\r\n// modified to use different syntax for a number of variables\r\n#if NUM_SAMPLES > 0\r\n    #ifndef WEBGL1\r\n        // https://learnopengl.com/PBR/IBL/Specular-IBL\r\n        // Hammersley\r\n        float radicalInverse_VdC(uint bits)\r\n        {\r\n            bits = (bits << 16u) | (bits >> 16u);\r\n            bits = ((bits & 0x55555555u) << 1u) | ((bits & 0xAAAAAAAAu) >> 1u);\r\n            bits = ((bits & 0x33333333u) << 2u) | ((bits & 0xCCCCCCCCu) >> 2u);\r\n            bits = ((bits & 0x0F0F0F0Fu) << 4u) | ((bits & 0xF0F0F0F0u) >> 4u);\r\n            bits = ((bits & 0x00FF00FFu) << 8u) | ((bits & 0xFF00FF00u) >> 8u);\r\n            return float(bits) * 2.3283064365386963e-10; // / 0x100000000\r\n        }\r\n\r\n        vec2 hammersley(uint i, uint N)\r\n        {\r\n            return vec2(float(i)/float(N), radicalInverse_VdC(i));\r\n        }\r\n    #else\r\n        float vanDerCorpus(int n, int base)\r\n        {\r\n            float invBase = 1.0 / float(base);\r\n            float denom   = 1.0;\r\n            float result  = 0.0;\r\n\r\n            for(int i = 0; i < 32; ++i)\r\n            {\r\n                if(n > 0)\r\n                {\r\n                    denom   = mod(float(n), 2.0);\r\n                    result += denom * invBase;\r\n                    invBase = invBase / 2.0;\r\n                    n       = int(float(n) / 2.0);\r\n                }\r\n            }\r\n\r\n            return result;\r\n        }\r\n\r\n        vec2 hammersley(int i, int N)\r\n        {\r\n            return vec2(float(i)/float(N), vanDerCorpus(i, 2));\r\n        }\r\n    #endif\r\n\r\n\t// from https://github.com/BabylonJS/Babylon.js/blob/5e6321d887637877d8b28b417410abbbeb651c6e/src/Shaders/ShadersInclude/importanceSampling.fx\r\n\tvec3 hemisphereImportanceSampleDggx(vec2 u, float a) {\r\n\t\t// pdf = D(a) * cosTheta\r\n\t\tfloat phi = 2. * PI * u.x;\r\n\r\n\t\t// NOTE: (aa-1) == (a-1)(a+1) produces better fp accuracy\r\n\t\tfloat cosTheta2 = (1. - u.y) / (1. + (a + 1.) * ((a - 1.) * u.y));\r\n\t\tfloat cosTheta = sqrt(cosTheta2);\r\n\t\tfloat sinTheta = sqrt(1. - cosTheta2);\r\n\r\n\t\treturn vec3(sinTheta * cos(phi), sinTheta * sin(phi), cosTheta);\r\n\t}\r\n\r\n\t// from https://google.github.io/filament/Filament.md.html#toc9.5\r\n\t// modified to use different syntax for a number of variables\r\n    const float NUM_SAMPLES_FLOAT = float(NUM_SAMPLES);\r\n    const float NUM_SAMPLES_FLOAT_INVERSED = 1. / NUM_SAMPLES_FLOAT;\r\n    const float NUM_SAMPLES_FLOAT_INVERSED4 = 4. / NUM_SAMPLES_FLOAT;\r\n\r\n    float Visibility(float NdotV, float NdotL, float alphaG)\r\n    {\r\n        // from https://github.com/BabylonJS/Babylon.js/blob/5e6321d887637877d8b28b417410abbbeb651c6e/src/Shaders/ShadersInclude/pbrBRDFFunctions.fx\r\n        #ifdef WEBGL1\r\n            // Appply simplification as all squared root terms are below 1 and squared\r\n            float GGXV = NdotL * (NdotV * (1.0 - alphaG) + alphaG);\r\n            float GGXL = NdotV * (NdotL * (1.0 - alphaG) + alphaG);\r\n            return 0.5 / (GGXV + GGXL);\r\n        #else\r\n            float a2 = alphaG * alphaG;\r\n            float GGXV = NdotL * sqrt(NdotV * (NdotV - a2 * NdotV) + a2);\r\n            float GGXL = NdotV * sqrt(NdotL * (NdotL - a2 * NdotL) + a2);\r\n            return 0.5 / (GGXV + GGXL);\r\n        #endif\r\n    }\r\n\r\n\tvoid main()\r\n\t{\r\n\t    // actual implementation (not documentation) here: https://github.com/google/filament/blob/94ff2ea6b1e39d909e9066459f2ce8c2942eb876/libs/ibl/src/CubemapIBL.cpp\r\n\t\t{{MODULE_BEGIN_FRAG}}\r\n\t\tfloat NoV = P.x;\r\n\t\tfloat a   = P.y;\r\n\r\n\t\tvec3 V;\r\n\t\tV.x = sqrt(1.0 - NoV*NoV);\r\n\t\tV.y = 0.0;\r\n\t\tV.z = NoV;\r\n\r\n\t\tvec2 r = vec2(0.0);\r\n\r\n        #ifndef WEBGL1\r\n        for(uint i = 0u; i < NUM_SAMPLES; i++)\r\n        #else\r\n        for(int i = 0; i < NUM_SAMPLES; i++)\r\n        #endif\r\n        {\r\n\t\t\tvec2 Xi = hammersley(i, NUM_SAMPLES);\r\n\t\t\tvec3 H  = hemisphereImportanceSampleDggx(Xi, a);\r\n\t\t\tvec3 L  = 2.0 * dot(V, H) * H - V;\r\n\r\n\t\t\tfloat VoH = clamp(dot(V, H), 0.0, 1.0);\r\n\t\t\tfloat NoL = clamp(L.z, 0.0, 1.0);\r\n\t\t\tfloat NoH = clamp(H.z, 0.0, 1.0);\r\n\r\n\t\t\tif (NoL > 0.0) {\r\n\t\t\t\tfloat Gv = Visibility(NoV, NoL, a) * NoL * (VoH / NoH);\r\n\t\t\t\tfloat Fc = pow(1.0 - VoH, 5.0);\r\n\r\n\t\t\t\t// modified for multiscattering https://google.github.io/filament/Filament.md.html#toc5.3.4.7\r\n\t\t\t    r.x += Gv * Fc;\r\n\t\t\t\tr.y += Gv;\r\n\t\t\t}\r\n\t\t}\r\n\t\tr *= NUM_SAMPLES_FLOAT_INVERSED4;\r\n\r\n\t\t{{MODULE_COLOR}}\r\n\t\toutColor = vec4(r.x, r.y, 0.0, 1.0);\r\n\t}\r\n#endif\r\n","IBLLUT_vert":"precision highp float;\r\nprecision highp int;\r\nprecision highp sampler2D;\r\n\r\n{{MODULES_HEAD}}\r\nIN vec3 vPosition;\r\nOUT vec3 P;\r\nUNI mat4 projMatrix;\r\nUNI mat4 viewMatrix;\r\nUNI mat4 modelMatrix;\r\n\r\nvoid main()\r\n{\r\n   vec4 pos     = vec4(vPosition,  1.0);\r\n   mat4 mMatrix = modelMatrix;\r\n\r\n   {{MODULE_VERTEX_POSITION}}\r\n\r\n   gl_Position  = pos;\r\n\r\n   P            = (vPosition + 1.0) * 0.5;\r\n}\r\n","irradiance_frag":"precision highp float;\r\nprecision highp int;\r\nprecision highp sampler2D;\r\n\r\n\r\n// from https://github.com/BabylonJS/Babylon.js/blob/5e6321d887637877d8b28b417410abbbeb651c6e/src/Shaders/ShadersInclude/hdrFilteringFunctions.fx\r\n// modified to use different syntax for a number of variables, equirectangular projection and rgbe encoding\r\n{{MODULES_HEAD}}\r\n#ifndef WEBGL1\r\n#define NUM_SAMPLES 2048u\r\n#else\r\n#define NUM_SAMPLES 2048\r\n#endif\r\n#define PI 3.14159265358\r\n#define PI_TWO 2.*PI\r\n#define RECIPROCAL_PI 1./PI\r\n#define RECIPROCAL_PI2 RECIPROCAL_PI/2.\r\n\r\n\r\n#ifdef WEBGL1\r\n    #ifdef GL_EXT_shader_texture_lod\r\n        #define textureLod texture2DLodEXT\r\n    #endif\r\n#endif\r\n#define SAMPLETEX textureLod\r\n\r\n// set by cables\r\nUNI vec3 camPos;\r\n\r\nIN  vec3 FragPos;\r\nUNI float rotation;\r\nUNI vec2 filteringInfo;\r\nUNI sampler2D EquiCubemap;\r\n\r\nvec2 SampleSphericalMap(vec3 direction, float rotation)\r\n{\r\n    #ifndef WEBGL1\r\n        vec3 newDirection = normalize(direction);\r\n\t\tvec2 sampleUV;\r\n\t\tsampleUV.x = -1. * (atan( direction.z, direction.x ) * RECIPROCAL_PI2 + 0.5);\r\n\t\tsampleUV.y = asin( clamp(direction.y, -1., 1.) ) * RECIPROCAL_PI + 0.5;\r\n    #endif\r\n\r\n    #ifdef WEBGL1\r\n        vec3 newDirection = normalize(direction);\r\n\t\tvec2 sampleUV = vec2(atan(newDirection.z, newDirection.x), asin(newDirection.y+1e-6));\r\n        sampleUV *= vec2(-0.1591, 0.3183);\r\n        sampleUV += 0.5;\r\n    #endif\r\n    sampleUV.x += rotation;\r\n    return sampleUV * vec2(-1.,1.);\r\n}\r\n\r\n// https://community.khronos.org/t/addition-of-two-hdr-rgbe-values/55669\r\nvec4 EncodeRGBE8(vec3 rgb)\r\n{\r\n    vec4 vEncoded;\r\n    float maxComponent = max(max(rgb.r, rgb.g), rgb.b);\r\n    float fExp = ceil(log2(maxComponent));\r\n    vEncoded.rgb = rgb / exp2(fExp);\r\n    vEncoded.a = (fExp + 128.0) / 255.0;\r\n    return vEncoded;\r\n}\r\n// https://enkimute.github.io/hdrpng.js/\r\nvec3 DecodeRGBE8(vec4 rgbe)\r\n{\r\n    vec3 vDecoded = rgbe.rgb * pow(2.0, rgbe.a * 255.0 - 128.0);\r\n    return vDecoded;\r\n}\r\n\r\n// from https://github.com/BabylonJS/Babylon.js/blob/5e6321d887637877d8b28b417410abbbeb651c6e/src/Shaders/ShadersInclude/importanceSampling.fx\r\nvec3 hemisphereCosSample(vec2 u) {\r\n    // pdf = cosTheta / M_PI;\r\n    float phi = 2. * PI * u.x;\r\n\r\n    float cosTheta2 = 1. - u.y;\r\n    float cosTheta = sqrt(cosTheta2);\r\n    float sinTheta = sqrt(1. - cosTheta2);\r\n\r\n    return vec3(sinTheta * cos(phi), sinTheta * sin(phi), cosTheta);\r\n}\r\n\r\n#ifndef WEBGL1\r\n    // https://learnopengl.com/PBR/IBL/Specular-IBL\r\n    // Hammersley\r\n    float radicalInverse_VdC(uint bits)\r\n    {\r\n        bits = (bits << 16u) | (bits >> 16u);\r\n        bits = ((bits & 0x55555555u) << 1u) | ((bits & 0xAAAAAAAAu) >> 1u);\r\n        bits = ((bits & 0x33333333u) << 2u) | ((bits & 0xCCCCCCCCu) >> 2u);\r\n        bits = ((bits & 0x0F0F0F0Fu) << 4u) | ((bits & 0xF0F0F0F0u) >> 4u);\r\n        bits = ((bits & 0x00FF00FFu) << 8u) | ((bits & 0xFF00FF00u) >> 8u);\r\n        return float(bits) * 2.3283064365386963e-10; // / 0x100000000\r\n    }\r\n\r\n    vec2 hammersley(uint i, uint N)\r\n    {\r\n        return vec2(float(i)/float(N), radicalInverse_VdC(i));\r\n    }\r\n#else\r\n    float vanDerCorpus(int n, int base)\r\n    {\r\n        float invBase = 1.0 / float(base);\r\n        float denom   = 1.0;\r\n        float result  = 0.0;\r\n\r\n        for(int i = 0; i < 32; ++i)\r\n        {\r\n            if(n > 0)\r\n            {\r\n                denom   = mod(float(n), 2.0);\r\n                result += denom * invBase;\r\n                invBase = invBase / 2.0;\r\n                n       = int(float(n) / 2.0);\r\n            }\r\n        }\r\n\r\n        return result;\r\n    }\r\n\r\n    vec2 hammersley(int i, int N)\r\n    {\r\n        return vec2(float(i)/float(N), vanDerCorpus(i, 2));\r\n    }\r\n#endif\r\n\r\n// from https://github.com/google/filament/blob/main/shaders/src/light_indirect.fs\r\nfloat prefilteredImportanceSampling(float ipdf, float omegaP)\r\n{\r\n    // See: \"Real-time Shading with Filtered Importance Sampling\", Jaroslav Krivanek\r\n    // Prefiltering doesn't work with anisotropy\r\n    const float numSamples = float(NUM_SAMPLES);\r\n    const float invNumSamples = 1.0 / float(numSamples);\r\n    const float K = 4.0;\r\n    float omegaS = invNumSamples * ipdf;\r\n    float mipLevel = log2(K * omegaS / omegaP) * 0.5;    // log4\r\n    return mipLevel;\r\n}\r\n\r\nconst float NUM_SAMPLES_FLOAT = float(NUM_SAMPLES);\r\nconst float NUM_SAMPLES_FLOAT_INVERSED = 1. / NUM_SAMPLES_FLOAT;\r\n\r\nconst float K = 4.;\r\n\r\nvoid main()\r\n{\r\n    {{MODULE_BEGIN_FRAG}}\r\n    vec4 col = vec4(0.0, 0.0, 0.0, 0.0);\r\n\r\n    vec3 n = normalize(FragPos);\r\n    vec3 tangent = normalize(cross(vec3(0.0, 0.0, 1.0), n));\r\n    vec3 bitangent = cross(n, tangent);\r\n    mat3 tbn = mat3(tangent, bitangent, n);\r\n\r\n    float maxLevel = filteringInfo.y;\r\n    float dim0 = filteringInfo.x;\r\n    float omegaP = (4. * PI) / (6. * dim0 * dim0);\r\n\r\n    #ifndef WEBGL1\r\n    for(uint i = 0u; i < NUM_SAMPLES; ++i)\r\n    #else\r\n    for(int i = 0; i < NUM_SAMPLES; ++i)\r\n    #endif\r\n    {\r\n        vec2 Xi = hammersley(i, NUM_SAMPLES);\r\n        vec3 Ls = hemisphereCosSample(Xi);\r\n\r\n        Ls = normalize(Ls);\r\n\r\n        vec3 Ns = vec3(0., 0., 1.);\r\n\r\n        float NoL = dot(Ns, Ls);\r\n\r\n        if (NoL > 0.) {\r\n            float pdf_inversed = PI / NoL;\r\n\r\n            float omegaS = NUM_SAMPLES_FLOAT_INVERSED * pdf_inversed;\r\n            // from https://github.com/google/filament/blob/main/shaders/src/light_indirect.fs\r\n            float l = log2(K * omegaS / omegaP) * 0.5;\r\n            float mipLevel = clamp(l + 1.0, 0.0, maxLevel);\r\n\r\n            #ifndef DONT_USE_RGBE_CUBEMAPS\r\n            vec3 c = DecodeRGBE8(SAMPLETEX(EquiCubemap, SampleSphericalMap(tbn * Ls, rotation), mipLevel)).rgb;\r\n            #else\r\n            vec3 c = SAMPLETEX(EquiCubemap, SampleSphericalMap(tbn * Ls, rotation), mipLevel).rgb;\r\n            #endif\r\n            col.rgb += c;\r\n        }\r\n    }\r\n\r\n    col = EncodeRGBE8(col.rgb * PI * NUM_SAMPLES_FLOAT_INVERSED);\r\n\r\n    {{MODULE_COLOR}}\r\n    outColor = col;\r\n}\r\n","irradiance_vert":"precision highp float;\r\nprecision highp int;\r\nprecision highp sampler2D;\r\n\r\n\r\n{{MODULES_HEAD}}\r\nIN vec3 vPosition;\r\nIN float attrVertIndex;\r\n\r\nOUT vec3 FragPos;\r\nUNI mat4 projMatrix;\r\nUNI mat4 viewMatrix;\r\nUNI mat4 modelMatrix;\r\n\r\n\r\nvoid main()\r\n{\r\n    FragPos     = vPosition;\r\n\r\n    {{MODULE_VERTEX_POSITION}}\r\n    gl_Position = projMatrix * viewMatrix * modelMatrix * vec4(vPosition, 1.0);\r\n    gl_Position = gl_Position.xyww;\r\n}\r\n","prefiltering_frag":"precision highp float;\r\nprecision highp int;\r\nprecision highp sampler2D;\r\n\r\n\r\n// from https://github.com/BabylonJS/Babylon.js/blob/5e6321d887637877d8b28b417410abbbeb651c6e/src/Shaders/ShadersInclude/hdrFilteringFunctions.fx\r\n// modified to use different syntax for a number of variables, equirectangular projection and rgbe encoding\r\n{{MODULES_HEAD}}\r\n#ifndef WEBGL1\r\n#define NUM_SAMPLES 2048u\r\n#else\r\n#define NUM_SAMPLES 2048\r\n#endif\r\n#define PI 3.14159265358\r\n#define PI_TWO 2.*PI\r\n#define RECIPROCAL_PI 1./PI\r\n#define RECIPROCAL_PI2 RECIPROCAL_PI/2.\r\n#define MINIMUMVARIANCE 0.0005\r\n\r\n\r\n#ifdef WEBGL1\r\n    #ifdef GL_EXT_shader_texture_lod\r\n        #define textureLod texture2DLodEXT\r\n    #endif\r\n#endif\r\n#define SAMPLETEX textureLod\r\n\r\nIN  vec3 FragPos;\r\nUNI float roughness;\r\nUNI float rotation;\r\nUNI vec2 filteringInfo;\r\nUNI sampler2D EquiCubemap;\r\n\r\nvec2 SampleSphericalMap(vec3 direction, float rotation)\r\n{\r\n    #ifndef WEBGL1\r\n        vec3 newDirection = normalize(direction);\r\n\t\tvec2 sampleUV;\r\n\t\tsampleUV.x = -1. * (atan( direction.z, direction.x ) * RECIPROCAL_PI2 + 0.5);\r\n\t\tsampleUV.y = asin( clamp(direction.y, -1., 1.) ) * RECIPROCAL_PI + 0.5;\r\n    #endif\r\n\r\n    #ifdef WEBGL1\r\n        vec3 newDirection = normalize(direction);\r\n\t\tvec2 sampleUV = vec2(atan(newDirection.z, newDirection.x), asin(newDirection.y+1e-6));\r\n        sampleUV *= vec2(-0.1591, 0.3183);\r\n        sampleUV += 0.5;\r\n    #endif\r\n    sampleUV.x += rotation;\r\n    return sampleUV * vec2(-1.,1.);\r\n}\r\n\r\n// https://community.khronos.org/t/addition-of-two-hdr-rgbe-values/55669\r\nvec4 EncodeRGBE8(vec3 rgb)\r\n{\r\n    vec4 vEncoded;\r\n    float maxComponent = max(max(rgb.r, rgb.g), rgb.b);\r\n    float fExp = ceil(log2(maxComponent));\r\n    vEncoded.rgb = rgb / exp2(fExp);\r\n    vEncoded.a = (fExp + 128.0) / 255.0;\r\n    return vEncoded;\r\n}\r\n// https://enkimute.github.io/hdrpng.js/\r\nvec3 DecodeRGBE8(vec4 rgbe)\r\n{\r\n    vec3 vDecoded = rgbe.rgb * pow(2.0, rgbe.a * 255.0-128.0);\r\n    return vDecoded;\r\n}\r\n\r\n// from https://github.com/BabylonJS/Babylon.js/blob/5e6321d887637877d8b28b417410abbbeb651c6e/src/Shaders/ShadersInclude/importanceSampling.fx\r\nvec3 hemisphereImportanceSampleDggx(vec2 u, float a) {\r\n    // pdf = D(a) * cosTheta\r\n    float phi = 2. * PI * u.x;\r\n\r\n    // NOTE: (aa-1) == (a-1)(a+1) produces better fp accuracy\r\n    float cosTheta2 = (1. - u.y) / (1. + (a + 1.) * ((a - 1.) * u.y));\r\n    float cosTheta = sqrt(cosTheta2);\r\n    float sinTheta = sqrt(1. - cosTheta2);\r\n\r\n    return vec3(sinTheta * cos(phi), sinTheta * sin(phi), cosTheta);\r\n}\r\n\r\n// from https://github.com/BabylonJS/Babylon.js/blob/5e6321d887637877d8b28b417410abbbeb651c6e/src/Shaders/ShadersInclude/pbrBRDFFunctions.fx\r\nfloat normalDistributionFunction_TrowbridgeReitzGGX(float NdotH, float alphaG)\r\n{\r\n    // Note: alphaG is average slope (gradient) of the normals in slope-space.\r\n    // It is also the (trigonometric) tangent of the median distribution value, i.e. 50% of normals have\r\n    // a tangent (gradient) closer to the macrosurface than this slope.\r\n    float a2 = alphaG * alphaG;\r\n    float d = NdotH * NdotH * (a2 - 1.0) + 1.0;\r\n    return a2 / (PI * d * d);\r\n}\r\n\r\n// from https://github.com/BabylonJS/Babylon.js/blob/5e6321d887637877d8b28b417410abbbeb651c6e/src/Shaders/ShadersInclude/pbrHelperFunctions.fx\r\nfloat convertRoughnessToAverageSlope(float roughness)\r\n{\r\n    // Calculate AlphaG as square of roughness (add epsilon to avoid numerical issues)\r\n    return (roughness * roughness) + MINIMUMVARIANCE;\r\n}\r\n\r\n\r\n#ifndef WEBGL1\r\n    // https://learnopengl.com/PBR/IBL/Specular-IBL\r\n    // Hammersley\r\n    float radicalInverse_VdC(uint bits)\r\n    {\r\n        bits = (bits << 16u) | (bits >> 16u);\r\n        bits = ((bits & 0x55555555u) << 1u) | ((bits & 0xAAAAAAAAu) >> 1u);\r\n        bits = ((bits & 0x33333333u) << 2u) | ((bits & 0xCCCCCCCCu) >> 2u);\r\n        bits = ((bits & 0x0F0F0F0Fu) << 4u) | ((bits & 0xF0F0F0F0u) >> 4u);\r\n        bits = ((bits & 0x00FF00FFu) << 8u) | ((bits & 0xFF00FF00u) >> 8u);\r\n        return float(bits) * 2.3283064365386963e-10; // / 0x100000000\r\n    }\r\n\r\n    vec2 hammersley(uint i, uint N)\r\n    {\r\n        return vec2(float(i)/float(N), radicalInverse_VdC(i));\r\n    }\r\n#else\r\n    float vanDerCorpus(int n, int base)\r\n    {\r\n        float invBase = 1.0 / float(base);\r\n        float denom   = 1.0;\r\n        float result  = 0.0;\r\n\r\n        for(int i = 0; i < 32; ++i)\r\n        {\r\n            if(n > 0)\r\n            {\r\n                denom   = mod(float(n), 2.0);\r\n                result += denom * invBase;\r\n                invBase = invBase / 2.0;\r\n                n       = int(float(n) / 2.0);\r\n            }\r\n        }\r\n\r\n        return result;\r\n    }\r\n\r\n    vec2 hammersley(int i, int N)\r\n    {\r\n        return vec2(float(i)/float(N), vanDerCorpus(i, 2));\r\n    }\r\n#endif\r\n\r\nfloat log4(float x)\r\n{\r\n    return log2(x) / 2.;\r\n}\r\n\r\nconst float NUM_SAMPLES_FLOAT = float(NUM_SAMPLES);\r\nconst float NUM_SAMPLES_FLOAT_INVERSED = 1. / NUM_SAMPLES_FLOAT;\r\n\r\nconst float K = 4.;\r\n\r\nvoid main()\r\n{\r\n    {{MODULE_BEGIN_FRAG}}\r\n    vec3 n = normalize(FragPos);\r\n    float alphaG = convertRoughnessToAverageSlope(roughness);\r\n    vec4 result = vec4(0.);\r\n\r\n    if (alphaG == 0.)\r\n    {\r\n        result = SAMPLETEX(EquiCubemap, SampleSphericalMap(n, rotation), 0.0);\r\n    }\r\n    else\r\n    {\r\n        vec3 tangent = abs(n.z) < 0.999 ? vec3(0., 0., 1.) : vec3(1., 0., 0.);\r\n        tangent = normalize(cross(tangent, n));\r\n        vec3 bitangent = cross(n, tangent);\r\n        mat3 tbn = mat3(tangent, bitangent, n);\r\n\r\n        float maxLevel = filteringInfo.y;\r\n        float dim0 = filteringInfo.x;\r\n        float omegaP = (4. * PI) / (6. * dim0 * dim0);\r\n\r\n        float weight = 0.;\r\n        #if defined(WEBGL2)\r\n        for(uint i = 0u; i < NUM_SAMPLES; ++i)\r\n        #else\r\n        for(int i = 0; i < NUM_SAMPLES; ++i)\r\n        #endif\r\n        {\r\n            vec2 Xi = hammersley(i, NUM_SAMPLES);\r\n            vec3 H = hemisphereImportanceSampleDggx(Xi, alphaG);\r\n\r\n            float NoV = 1.;\r\n            float NoH = H.z;\r\n            float NoH2 = H.z * H.z;\r\n            float NoL = 2. * NoH2 - 1.;\r\n            vec3 L = vec3(2. * NoH * H.x, 2. * NoH * H.y, NoL);\r\n            L = normalize(L);\r\n\r\n            if (NoL > 0.)\r\n            {\r\n                float pdf_inversed = 4. / normalDistributionFunction_TrowbridgeReitzGGX(NoH, alphaG);\r\n\r\n                float omegaS = NUM_SAMPLES_FLOAT_INVERSED * pdf_inversed;\r\n                float l = log4(omegaS) - log4(omegaP) + log4(K);\r\n                float mipLevel = clamp(l, 0.0, maxLevel);\r\n\r\n                weight += NoL;\r\n\r\n                #ifndef DONT_USE_RGBE_CUBEMAPS\r\n                vec3 c = DecodeRGBE8(SAMPLETEX(EquiCubemap, SampleSphericalMap(tbn * L, rotation), mipLevel)).rgb;\r\n                #else\r\n                vec3 c = SAMPLETEX(EquiCubemap, SampleSphericalMap(tbn * L, rotation), mipLevel).rgb;\r\n                #endif\r\n                result.rgb += c * NoL;\r\n            }\r\n        }\r\n\r\n        result = result / weight;\r\n        result = EncodeRGBE8(result.rgb);\r\n    }\r\n\r\n    {{MODULE_COLOR}}\r\n    outColor = result;\r\n}\r\n","prefiltering_vert":"precision highp float;\r\nprecision highp int;\r\nprecision highp sampler2D;\r\n\r\n{{MODULES_HEAD}}\r\nIN vec3 vPosition;\r\nIN float attrVertIndex;\r\n\r\nOUT vec3 FragPos;\r\nUNI mat4 projMatrix;\r\nUNI mat4 viewMatrix;\r\nUNI mat4 modelMatrix;\r\n\r\n\r\nvoid main()\r\n{\r\n    FragPos     = vPosition;\r\n\r\n    {{MODULE_VERTEX_POSITION}}\r\n    gl_Position = projMatrix * viewMatrix * modelMatrix * vec4(vPosition, 1.0);\r\n    gl_Position = gl_Position.xyww;\r\n}\r\n",};
// utility
const cgl = op.patch.cgl;
const IS_WEBGL_1 = cgl.glVersion == 1;

const BB = new CABLES.CG.BoundingBox();
const geometry = new CGL.Geometry("unit cube");
geometry.vertices = new Float32Array([
    -1.0, 1.0, -1.0,
    -1.0, -1.0, -1.0,
    1.0, -1.0, -1.0,
    1.0, -1.0, -1.0,
    1.0, 1.0, -1.0,
    -1.0, 1.0, -1.0,

    -1.0, -1.0, 1.0,
    -1.0, -1.0, -1.0,
    -1.0, 1.0, -1.0,
    -1.0, 1.0, -1.0,
    -1.0, 1.0, 1.0,
    -1.0, -1.0, 1.0,

    1.0, -1.0, -1.0,
    1.0, -1.0, 1.0,
    1.0, 1.0, 1.0,
    1.0, 1.0, 1.0,
    1.0, 1.0, -1.0,
    1.0, -1.0, -1.0,

    -1.0, -1.0, 1.0,
    -1.0, 1.0, 1.0,
    1.0, 1.0, 1.0,
    1.0, 1.0, 1.0,
    1.0, -1.0, 1.0,
    -1.0, -1.0, 1.0,

    -1.0, 1.0, -1.0,
    1.0, 1.0, -1.0,
    1.0, 1.0, 1.0,
    1.0, 1.0, 1.0,
    -1.0, 1.0, 1.0,
    -1.0, 1.0, -1.0,

    -1.0, -1.0, -1.0,
    -1.0, -1.0, 1.0,
    1.0, -1.0, -1.0,
    1.0, -1.0, -1.0,
    -1.0, -1.0, 1.0,
    1.0, -1.0, 1.0
]);
const mesh = new CGL.Mesh(cgl, geometry);
const fullscreenRectangle = CGL.MESHES.getSimpleRect(cgl, "fullscreenRectangle");
// inputs
const inTrigger = op.inTrigger("render");
const inIntensity = op.inFloatSlider("Intensity", 1);
const inCubemap = op.inTexture("RGBE Environment map");

const inIrradianceSize = op.inDropDown("Size Irradiance map", [16, 32, 64], 64);
const inPrefilteredSize = op.inDropDown("Size pre-filtered environment", [64, 128], 128);
const inIBLLUTSize = op.inDropDown("Size IBL LUT", [128, 256, 512, 1024], 256);
const inForce8bitIbl = op.inBool("Force 8bit IBL", true);
const inToggleRGBE = op.inBool("Environment map does not contain RGBE data", false);
const inRotation = op.inFloat("Rotation", 0.0);
const inUseParallaxCorrection = op.inValueBool("Use parallax correction", false);

const inPCOriginX = op.inFloat("center X", 0);
const inPCOriginY = op.inFloat("center Y", 1.8);
const inPCOriginZ = op.inFloat("center Z", 0);
const inPCboxMinX = op.inFloat("Box min X", -1);
const inPCboxMinY = op.inFloat("Box min Y", -1);
const inPCboxMinZ = op.inFloat("Box min Z", -1);
const inPCboxMaxX = op.inFloat("Box max X", 1);
const inPCboxMaxY = op.inFloat("Box max Y", 1);
const inPCboxMaxZ = op.inFloat("Box max Z", 1);

op.setPortGroup("Parallax Correction", [
    inUseParallaxCorrection,
    inPCOriginX,
    inPCOriginY,
    inPCOriginZ,
    inPCboxMinX,
    inPCboxMinY,
    inPCboxMinZ,
    inPCboxMaxX,
    inPCboxMaxY,
    inPCboxMaxZ
]);

let IrradianceSizeChanged = true;
let PrefilteredSizeChanged = true;
let IBLLUTSettingsChanged = true;
inIrradianceSize.onChange = () => { IrradianceSizeChanged = true; };
inPrefilteredSize.onChange = () => { PrefilteredSizeChanged = true; };
inIBLLUTSize.onChange =
    inForce8bitIbl.onChange = () => { IBLLUTSettingsChanged = true; };

// outputs
const outTrigger = op.outTrigger("next");

const outTexIBLLUT = op.outTexture("IBL LUT");
const outTexIrradiance = op.outTexture("cubemap (diffuse irradiance)");
const outTexPrefiltered = op.outTexture("cubemap (pre-filtered environment map)");
const outMipLevels = op.outNumber("Number of Pre-filtered mip levels");
// UI stuff
op.toWorkPortsNeedToBeLinked(inCubemap);

// globals
let irradianceFrameBuffer = null;
let PrefilteredTexture = null;
let prefilteredFrameBuffer = null;
let iblLutFrameBuffer = null;
let maxMipLevels = null;
const pbrEnv = {};
const IrradianceShader = new CGL.Shader(cgl, "IrradianceShader");
const PrefilteringShader = new CGL.Shader(cgl, "PrefilteringShader");
IrradianceShader.setModules(["MODULE_VERTEX_POSITION", "MODULE_COLOR", "MODULE_BEGIN_FRAG"]);
PrefilteringShader.setModules(["MODULE_VERTEX_POSITION", "MODULE_COLOR", "MODULE_BEGIN_FRAG"]);

if (cgl.glVersion == 1)
{
    if (!cgl.gl.getExtension("EXT_shader_texture_lod"))
    {
        op.log("no EXT_shader_texture_lod texture extension");
        throw "no EXT_shader_texture_lod texture extension";
    }
    else
    {
        IrradianceShader.enableExtension("GL_EXT_shader_texture_lod");
        PrefilteringShader.enableExtension("GL_EXT_shader_texture_lod");
        cgl.gl.getExtension("OES_texture_float");
        cgl.gl.getExtension("OES_texture_float_linear");
        cgl.gl.getExtension("OES_texture_half_float");
        cgl.gl.getExtension("OES_texture_half_float_linear");

        cgl.gl.getExtension("WEBGL_color_buffer_float");

        IrradianceShader.enableExtension("GL_OES_standard_derivatives");
        IrradianceShader.enableExtension("GL_OES_texture_float");
        IrradianceShader.enableExtension("GL_OES_texture_float_linear");
        IrradianceShader.enableExtension("GL_OES_texture_half_float");
        IrradianceShader.enableExtension("GL_OES_texture_half_float_linear");
        PrefilteringShader.enableExtension("GL_OES_standard_derivatives");
        PrefilteringShader.enableExtension("GL_OES_texture_float");
        PrefilteringShader.enableExtension("GL_OES_texture_float_linear");
        PrefilteringShader.enableExtension("GL_OES_texture_half_float");
        PrefilteringShader.enableExtension("GL_OES_texture_half_float_linear");
    }
}

let filteringInfo = [0, 0];
IrradianceShader.offScreenPass = true;
const uniformIrradianceCubemap = new CGL.Uniform(IrradianceShader, "t", "EquiCubemap", 0);
const uniformFilteringInfo = new CGL.Uniform(IrradianceShader, "2f", "filteringInfo", filteringInfo);
const uniformRotation = new CGL.Uniform(IrradianceShader, "f", "rotation", 0);
IrradianceShader.setSource(attachments.irradiance_vert, attachments.irradiance_frag);

let prefilteringInfo = [0, 0];
PrefilteringShader.offScreenPass = true;
const uniformPrefilteringCubemap = new CGL.Uniform(PrefilteringShader, "t", "EquiCubemap", 0);
const uniformPrefilteringRoughness = new CGL.Uniform(PrefilteringShader, "f", "roughness", 0);
const uniformPrefilteringRotation = new CGL.Uniform(PrefilteringShader, "f", "rotation", 0);
const uniformPrefilteringInfo = new CGL.Uniform(PrefilteringShader, "2f", "filteringInfo", prefilteringInfo);
PrefilteringShader.setSource(attachments.prefiltering_vert, attachments.prefiltering_frag);

const IBLLUTShader = new CGL.Shader(cgl, "IBLLUTShader");
IBLLUTShader.offScreenPass = true;
IBLLUTShader.setModules(["MODULE_VERTEX_POSITION", "MODULE_COLOR", "MODULE_BEGIN_FRAG"]);
IBLLUTShader.setSource(attachments.IBLLUT_vert, attachments.IBLLUT_frag);

inToggleRGBE.onChange = () =>
{
    IrradianceShader.toggleDefine("DONT_USE_RGBE_CUBEMAPS", inToggleRGBE);
    PrefilteringShader.toggleDefine("DONT_USE_RGBE_CUBEMAPS", inToggleRGBE);

    IrradianceSizeChanged = true;
    PrefilteredSizeChanged = true;
};

inRotation.onChange = () =>
{
    PrefilteredSizeChanged =
    IrradianceSizeChanged = true;
};

// utility functions
function captureIrradianceCubemap(size)
{
    if (irradianceFrameBuffer) irradianceFrameBuffer.dispose();

    irradianceFrameBuffer = new CGL.CubemapFramebuffer(cgl, Number(size), Number(size), {
        // "isFloatingPointTexture": false,
        "clear": false,
        "filter": CGL.Texture.FILTER_NEAREST, // due to banding with rgbe
        "wrap": CGL.Texture.WRAP_CLAMP_TO_EDGE
    });

    filteringInfo[0] = size;
    filteringInfo[1] = 1.0 + Math.floor(Math.log(size) * 1.44269504088896340736);

    IrradianceShader.popTextures();
    IrradianceShader.pushTexture(uniformIrradianceCubemap, inCubemap.get().tex);
    uniformRotation.setValue(inRotation.get() / 360.0);

    irradianceFrameBuffer.renderStart(cgl);
    for (let i = 0; i < 6; i += 1)
    {
        irradianceFrameBuffer.renderStartCubemapFace(i);

        //  cgl.gl.clearColor(0, 0, 0, 0);
        // if(i==0) cgl.gl.clear(cgl.gl.COLOR_BUFFER_BIT | cgl.gl.DEPTH_BUFFER_BIT);
        mesh.render(IrradianceShader);
        irradianceFrameBuffer.renderEndCubemapFace();
    }
    irradianceFrameBuffer.renderEnd();

    // outTexIrradiance.set(null); // pandur
    outTexIrradiance.set(irradianceFrameBuffer.getTextureColor());
}

function capturePrefilteredCubemap(size)
{
    size = Number(size);
    let captureFBO = new CGL.CubemapFramebuffer(cgl, size, size, {
        "isFloatingPointTexture": false,
        "clear": false,
        "filter": CGL.Texture.FILTER_LINEAR,
        "wrap": CGL.Texture.WRAP_CLAMP_TO_EDGE
    });

    if (prefilteredFrameBuffer) prefilteredFrameBuffer.dispose();

    prefilteredFrameBuffer = new CGL.CubemapFramebuffer(cgl, size, size, {
        "clear": false,
        "filter": CGL.Texture.FILTER_MIPMAP,
        "wrap": CGL.Texture.WRAP_CLAMP_TO_EDGE
    });

    cgl.gl.bindTexture(cgl.gl.TEXTURE_CUBE_MAP, prefilteredFrameBuffer.getTextureColor().tex);

    cgl.gl.texParameteri(cgl.gl.TEXTURE_CUBE_MAP, cgl.gl.TEXTURE_WRAP_S, cgl.gl.CLAMP_TO_EDGE);
    cgl.gl.texParameteri(cgl.gl.TEXTURE_CUBE_MAP, cgl.gl.TEXTURE_WRAP_T, cgl.gl.CLAMP_TO_EDGE);
    if (cgl.glVersion == 2) cgl.gl.texParameteri(cgl.gl.TEXTURE_CUBE_MAP, cgl.gl.TEXTURE_WRAP_R, cgl.gl.CLAMP_TO_EDGE);
    cgl.gl.texParameteri(cgl.gl.TEXTURE_CUBE_MAP, cgl.gl.TEXTURE_MIN_FILTER, cgl.gl.LINEAR_MIPMAP_LINEAR);
    cgl.gl.texParameteri(cgl.gl.TEXTURE_CUBE_MAP, cgl.gl.TEXTURE_MAG_FILTER, cgl.gl.LINEAR);
    cgl.gl.generateMipmap(cgl.gl.TEXTURE_CUBE_MAP); // make sure memory is assigned for mips

    maxMipLevels = 1.0 + Math.floor(Math.log(size) * 1.44269504088896340736);
    outMipLevels.set(maxMipLevels);
    prefilteringInfo[0] = size;
    prefilteringInfo[1] = maxMipLevels;

    PrefilteringShader.popTextures();
    PrefilteringShader.pushTexture(uniformPrefilteringCubemap, inCubemap.get().tex);
    uniformPrefilteringRotation.setValue(inRotation.get() / 360.0);

    let iosFix = /^((?!chrome|android).)*safari/i.test(navigator.userAgent) && (navigator.userAgent.match(/iPhone/i));

    if (iosFix)
    {
        maxMipLevels = 0;
    }

    for (let mip = 0; mip <= maxMipLevels; ++mip)
    {
        const currentMipSize = size * 0.5 ** mip;
        const roughness = mip / (maxMipLevels - 1);
        uniformPrefilteringRoughness.setValue(roughness);

        captureFBO.setSize(currentMipSize, currentMipSize);
        captureFBO.renderStart(cgl);
        for (let i = 0; i < 6; i++)
        {
            captureFBO.renderStartCubemapFace(i);

            mesh.render(PrefilteringShader);

            cgl.gl.bindTexture(cgl.gl.TEXTURE_CUBE_MAP, prefilteredFrameBuffer.getTextureColor().tex);
            cgl.gl.copyTexImage2D(cgl.gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, mip, cgl.gl.RGBA8, 0, 0, currentMipSize, currentMipSize, 0);
            captureFBO.renderEndCubemapFace();
        }
        captureFBO.renderEnd();
    }

    if (iosFix)
    {
        cgl.gl.bindTexture(cgl.gl.TEXTURE_CUBE_MAP, prefilteredFrameBuffer.getTextureColor().tex);
        cgl.gl.generateMipmap(cgl.gl.TEXTURE_CUBE_MAP);
    }

    captureFBO.delete();
    cgl.setTexture(0, null);

    outTexPrefiltered.setRef(prefilteredFrameBuffer.getTextureColor());
}

function computeIBLLUT(size)
{
    size = Number(size);
    if (iblLutFrameBuffer) iblLutFrameBuffer.dispose();

    if (IS_WEBGL_1)
    {
        iblLutFrameBuffer = new CGL.Framebuffer(cgl, size, size, {
            "isFloatingPointTexture": true,
            "filter": CGL.Texture.FILTER_LINEAR,
            "wrap": CGL.Texture.WRAP_CLAMP_TO_EDGE
        });
    }
    else
    {
        let isFloatingPointTexture = (!inForce8bitIbl.get()) && !cgl.glUseHalfFloatTex;

        if (isFloatingPointTexture)
        {
            iblLutFrameBuffer = new CGL.Framebuffer2(cgl, size, size, {
                "pixelFormat": CGL.Texture.PFORMATSTR_RG16F,
                "filter": CGL.Texture.FILTER_LINEAR,
                "wrap": CGL.Texture.WRAP_CLAMP_TO_EDGE,
            });
        }
        else
        {
            iblLutFrameBuffer = new CGL.Framebuffer2(cgl, size, size, {
                "filter": CGL.Texture.FILTER_LINEAR,
                "pixelFormat": CGL.Texture.PFORMATSTR_RGBA8UB,
                "wrap": CGL.Texture.WRAP_CLAMP_TO_EDGE,
            });
        }
    }

    cgl.tempData.renderOffscreen = true;
    iblLutFrameBuffer.renderStart(cgl);
    fullscreenRectangle.render(IBLLUTShader);
    iblLutFrameBuffer.renderEnd();
    cgl.tempData.renderOffscreen = false;
    outTexIBLLUT.set(iblLutFrameBuffer.getTextureColor());
}

inCubemap.onChange = () =>
{
    if (inCubemap.get())
        op.setUiError("nocubemapinput", null);

    PrefilteredSizeChanged =
    IrradianceSizeChanged = true;
};

function drawHelpers()
{
    gui.setTransformGizmo({
        "posX": inPCOriginX,
        "posY": inPCOriginY,
        "posZ": inPCOriginZ,
    });
    gui.setTransformGizmo({
        "posX": inPCboxMinX,
        "posY": inPCboxMinY,
        "posZ": inPCboxMinZ,
    }, 1);
    gui.setTransformGizmo({
        "posX": inPCboxMaxX,
        "posY": inPCboxMaxY,
        "posZ": inPCboxMaxZ,
    }, 2);
    if (CABLES.UI && gui.shouldDrawOverlay)
    {
        cgl.pushShader(CABLES.GL_MARKER.getDefaultShader(cgl));
    }
    else
    {
        cgl.pushShader(CABLES.GL_MARKER.getSelectedShader(cgl));
    }
    cgl.pushModelMatrix();
    // translate
    mat4.translate(cgl.mMatrix, cgl.mMatrix, [(inPCboxMinX.get() + inPCboxMaxX.get()) / 2.0, (inPCboxMinY.get() + inPCboxMaxY.get()) / 2.0, (inPCboxMinZ.get() + inPCboxMaxZ.get()) / 2.0]);
    // scale to bounds
    mat4.scale(cgl.mMatrix, cgl.mMatrix, [(inPCboxMaxX.get() - inPCboxMinX.get()) / 2.0, (inPCboxMaxY.get() - inPCboxMinY.get()) / 2.0, (inPCboxMaxZ.get() - inPCboxMinZ.get()) / 2.0]);
    // draw
    BB.render(cgl);
    cgl.popShader();
    cgl.popModelMatrix();
}

inUseParallaxCorrection.onChange = () =>
{
    const active = inUseParallaxCorrection.get();
    inPCOriginX.setUiAttribs({ "greyout": !active });
    inPCOriginY.setUiAttribs({ "greyout": !active });
    inPCOriginZ.setUiAttribs({ "greyout": !active });
    inPCboxMinX.setUiAttribs({ "greyout": !active });
    inPCboxMinY.setUiAttribs({ "greyout": !active });
    inPCboxMinZ.setUiAttribs({ "greyout": !active });
    inPCboxMaxX.setUiAttribs({ "greyout": !active });
    inPCboxMaxY.setUiAttribs({ "greyout": !active });
    inPCboxMaxZ.setUiAttribs({ "greyout": !active });
};

// onTriggered
inTrigger.onTriggered = function ()
{
    if (!inCubemap.get())
    {
        outTrigger.trigger();
        op.setUiError("nocubemapinput", "No Environment Texture connected");
        return;
    }

    uniformFilteringInfo.setValue(filteringInfo);
    uniformPrefilteringInfo.setValue(prefilteringInfo);

    if (!cgl.tempData.shadowPass)
    {
        if (IBLLUTSettingsChanged)
        {
            computeIBLLUT(Number(inIBLLUTSize.get()));
            IBLLUTSettingsChanged = false;
        }

        if (PrefilteredSizeChanged)
        {
            capturePrefilteredCubemap(Number(inPrefilteredSize.get()));
            PrefilteredSizeChanged = false;
        }

        if (IrradianceSizeChanged)
        {
            captureIrradianceCubemap(Number(inIrradianceSize.get()));
            IrradianceSizeChanged = false;
        }
    }

    pbrEnv.texIBLLUT = iblLutFrameBuffer.getTextureColor();
    pbrEnv.texDiffIrr = irradianceFrameBuffer.getTextureColor();// outTexIrradiance.get();
    pbrEnv.texPreFiltered = prefilteredFrameBuffer.getTextureColor();// outTexPrefiltered.get();
    pbrEnv.texPreFilteredMipLevels = outMipLevels.get();

    pbrEnv.intensity = inIntensity.get();
    pbrEnv.UseParallaxCorrection = inUseParallaxCorrection.get();
    pbrEnv.PCOrigin = [inPCOriginX.get(), inPCOriginY.get(), inPCOriginZ.get()];
    pbrEnv.PCboxMin = [inPCboxMinX.get(), inPCboxMinY.get(), inPCboxMinZ.get()];
    pbrEnv.PCboxMax = [inPCboxMaxX.get(), inPCboxMaxY.get(), inPCboxMaxZ.get()];

    cgl.tempData.pbrEnvStack = cgl.tempData.pbrEnvStack || [];
    cgl.tempData.pbrEnvStack.push(pbrEnv);

    if (cgl.shouldDrawHelpers(op) && pbrEnv.UseParallaxCorrection && !cgl.tempData.shadowPass) drawHelpers();

    outTrigger.trigger();
    cgl.tempData.pbrEnvStack.pop();
};

}
};

CABLES.OPS["7110f169-adfd-4649-a77a-c825751eaa9b"]={f:Ops.Gl.Pbr.PbrEnvironmentLight,objName:"Ops.Gl.Pbr.PbrEnvironmentLight"};




// **************************************************************
// 
// Ops.Gl.Texture_v2
// 
// **************************************************************

Ops.Gl.Texture_v2= class extends CABLES.Op 
{
constructor()
{
super(...arguments);
const op=this;
const attachments=op.attachments={};
const
    filename = op.inUrl("File", [".jpg", ".png", ".webp", ".jpeg", ".avif"]),
    tfilter = op.inSwitch("Filter", ["nearest", "linear", "mipmap"]),
    wrap = op.inValueSelect("Wrap", ["repeat", "mirrored repeat", "clamp to edge"], "clamp to edge"),
    aniso = op.inSwitch("Anisotropic", ["0", "1", "2", "4", "8", "16"], "0"),
    dataFrmt = op.inSwitch("Data Format", ["R", "RG", "RGB", "RGBA", "SRGBA"], "RGBA"),
    flip = op.inValueBool("Flip", false),
    unpackAlpha = op.inValueBool("Pre Multiplied Alpha", false),
    active = op.inValueBool("Active", true),
    inFreeMemory = op.inBool("Save Memory", true),
    textureOut = op.outTexture("Texture"),
    addCacheBust = op.inBool("Add Cachebuster", false),
    inReload = op.inTriggerButton("Reload"),
    width = op.outNumber("Width"),
    height = op.outNumber("Height"),
    ratio = op.outNumber("Aspect Ratio"),
    loaded = op.outBoolNum("Loaded", 0),
    loading = op.outBoolNum("Loading", 0);

const cgl = op.patch.cgl;

op.toWorkPortsNeedToBeLinked(textureOut);
op.setPortGroup("Size", [width, height]);

let loadedFilename = null;
let loadingId = null;
let tex = null;
let cgl_filter = CGL.Texture.FILTER_MIPMAP;
let cgl_wrap = CGL.Texture.WRAP_REPEAT;
let cgl_aniso = 0;
let timedLoader = 0;

unpackAlpha.setUiAttribs({ "hidePort": true });
unpackAlpha.onChange =
    filename.onChange =
    dataFrmt.onChange =
    addCacheBust.onChange =
    flip.onChange = reloadSoon;
aniso.onChange = tfilter.onChange = onFilterChange;
wrap.onChange = onWrapChange;

tfilter.set("mipmap");
wrap.set("repeat");

textureOut.setRef(CGL.Texture.getEmptyTexture(cgl));

inReload.onTriggered = reloadSoon;

active.onChange = function ()
{
    if (active.get())
    {
        if (loadedFilename != filename.get() || !tex) reloadSoon();
        else textureOut.setRef(tex);
    }
    else
    {
        textureOut.setRef(CGL.Texture.getEmptyTexture(cgl));
        width.set(CGL.Texture.getEmptyTexture(cgl).width);
        height.set(CGL.Texture.getEmptyTexture(cgl).height);
        if (tex)tex.delete();
        op.setUiAttrib({ "extendTitle": "" });
        tex = null;
    }
};

const setTempTexture = function ()
{
    const t = CGL.Texture.getTempTexture(cgl);
    textureOut.setRef(t);
};

function reloadSoon(nocache)
{
    clearTimeout(timedLoader);
    timedLoader = setTimeout(function ()
    {
        realReload(nocache);
    }, 1);
}

function getPixelFormat()
{
    if (dataFrmt.get() == "R") return CGL.Texture.PFORMATSTR_R8UB;
    if (dataFrmt.get() == "RG") return CGL.Texture.PFORMATSTR_RG8UB;
    if (dataFrmt.get() == "RGB") return CGL.Texture.PFORMATSTR_RGB8UB;
    if (dataFrmt.get() == "SRGBA") return CGL.Texture.PFORMATSTR_SRGBA8;

    return CGL.Texture.PFORMATSTR_RGBA8UB;
}

function realReload(nocache)
{
    op.checkMainloopExists();
    if (!active.get()) return;
    if (loadingId)loadingId = cgl.patch.loading.finished(loadingId);

    loadingId = cgl.patch.loading.start(op.objName, filename.get(), op);

    let url = op.patch.getFilePath(String(filename.get()));

    if (addCacheBust.get() || nocache === true) url = CABLES.cacheBust(url);

    if (String(filename.get()).indexOf("data:") == 0) url = filename.get();

    let needsRefresh = false;
    loadedFilename = filename.get();

    if ((filename.get() && filename.get().length > 1))
    {
        loaded.set(false);
        loading.set(true);

        const fileToLoad = filename.get();

        op.setUiAttrib({ "extendTitle": CABLES.basename(url) });
        if (needsRefresh) op.refreshParams();

        cgl.patch.loading.addAssetLoadingTask(() =>
        {
            op.setUiError("urlerror", null);
            CGL.Texture.load(cgl, url, function (err, newTex)
            {
                cgl.checkFrameStarted("texture inittexture");

                if (filename.get() != fileToLoad)
                {
                    loadingId = cgl.patch.loading.finished(loadingId);
                    return;
                }

                if (tex)tex.delete();

                if (err)
                {
                    const t = CGL.Texture.getErrorTexture(cgl);
                    textureOut.setRef(t);

                    op.setUiError("urlerror", "could not load texture: \"" + filename.get() + "\"", 2);
                    loadingId = cgl.patch.loading.finished(loadingId);
                    return;
                }

                // textureOut.setRef(newTex);

                width.set(newTex.width);
                height.set(newTex.height);
                ratio.set(newTex.width / newTex.height);

                // if (!newTex.isPowerOfTwo()) op.setUiError("npot", "Texture dimensions not power of two! - Texture filtering will not work in WebGL 1.", 0);
                // else op.setUiError("npot", null);

                tex = newTex;
                // textureOut.setRef(null);
                textureOut.setRef(tex);

                loading.set(false);
                loaded.set(true);

                if (inFreeMemory.get()) tex.image = null;

                if (loadingId)
                {
                    loadingId = cgl.patch.loading.finished(loadingId);
                }
                op.checkMainloopExists();
            }, {
                "anisotropic": cgl_aniso,
                "wrap": cgl_wrap,
                "flip": flip.get(),
                "unpackAlpha": unpackAlpha.get(),
                "pixelFormat": getPixelFormat(),
                "filter": cgl_filter
            });

            op.checkMainloopExists();
        });
    }
    else
    {
        setTempTexture();
        loadingId = cgl.patch.loading.finished(loadingId);
    }
}

function onFilterChange()
{
    if (tfilter.get() == "nearest") cgl_filter = CGL.Texture.FILTER_NEAREST;
    else if (tfilter.get() == "linear") cgl_filter = CGL.Texture.FILTER_LINEAR;
    else if (tfilter.get() == "mipmap") cgl_filter = CGL.Texture.FILTER_MIPMAP;
    else if (tfilter.get() == "Anisotropic") cgl_filter = CGL.Texture.FILTER_ANISOTROPIC;
    aniso.setUiAttribs({ "greyout": cgl_filter != CGL.Texture.FILTER_MIPMAP });

    cgl_aniso = parseFloat(aniso.get());

    reloadSoon();
}

function onWrapChange()
{
    if (wrap.get() == "repeat") cgl_wrap = CGL.Texture.WRAP_REPEAT;
    if (wrap.get() == "mirrored repeat") cgl_wrap = CGL.Texture.WRAP_MIRRORED_REPEAT;
    if (wrap.get() == "clamp to edge") cgl_wrap = CGL.Texture.WRAP_CLAMP_TO_EDGE;

    reloadSoon();
}

op.onFileChanged = function (fn)
{
    if (filename.get() && filename.get().indexOf(fn) > -1)
    {
        textureOut.setRef(CGL.Texture.getEmptyTexture(op.patch.cgl));
        textureOut.setRef(CGL.Texture.getTempTexture(cgl));
        realReload(true);
    }
};

}
};

CABLES.OPS["790f3702-9833-464e-8e37-6f0f813f7e16"]={f:Ops.Gl.Texture_v2,objName:"Ops.Gl.Texture_v2"};




// **************************************************************
// 
// Ops.Extension.AmmoPhysics.GltfAmmoBodies
// 
// **************************************************************

Ops.Extension.AmmoPhysics.GltfAmmoBodies= class extends CABLES.Op 
{
constructor()
{
super(...arguments);
const op=this;
const attachments=op.attachments={};
const
    inExec = op.inTrigger("Exec"),
    inShape = op.inSwitch("Shape", ["Convex Hull", "Triangle Shape"], "Convex Hull"),
    inNames = op.inString("Filter Meshes", ""),
    inMass = op.inFloat("Mass kg", 0),

    inActive = op.inBool("Active", true),
    outNum = op.outNumber("Meshes", 0);

const cgl = op.patch.cgl;
const bodies = [];
const vec = vec3.create();
const empty = vec3.create();
const trMat = mat4.create();
const size = 1.0;

let world = null;
let scene = null;
let added = false;
let currentSceneLoaded = 0;

inExec.onTriggered = update;

const SHAPE_BOX = 0;
const SHAPE_SPHERE = 1;
const shape = SHAPE_BOX;
const sizeVec = vec3.create();

const meshCube = new CGL.WireCube(cgl);

let tmpTrans = null;

inMass.onChange =
inShape.onChange =
inNames.onChange =
inExec.onLinkChanged = () =>
{
    removeFromWorld();
    added = false;
};

inActive.onChange = () =>
{
    if (!inActive.get())removeFromWorld();
    update();
};

function update()
{
    if (!inActive.get()) return;
    if (!added || world != cgl.frameStore.ammoWorld) addToWorld();

    if (world && bodies.length && bodies[0] && world.getBodyMeta(bodies[0].body) == undefined)removeFromWorld();

    ping();
    for (let i = 0; i < bodies.length; i++)
    {
        cgl.pushModelMatrix();

        mat4.identity(cgl.mMatrix);

        mat4.mul(cgl.mMatrix, cgl.mMatrix, bodies[i].node.modelMatAbs());

        if (!tmpTrans)tmpTrans = new Ammo.btTransform();

        CABLES.AmmoWorld.copyCglTransform(cgl, tmpTrans);

        bodies[i].motionState.setWorldTransform(tmpTrans);
        bodies[i].body.setWorldTransform(tmpTrans);

        cgl.popModelMatrix();
    }
}

function removeFromWorld()
{
    if (world)
    {
        for (let i = 0; i < bodies.length; i++)
        {
            world.removeRigidBody(bodies[i].body);
        }
    }
    bodies.length = 0;
    outNum.set(bodies.length);
    world = null;
    added = false;
}

function ping()
{
    if (world)
        for (let i = 0; i < bodies.length; i++)
            world.pingBody(bodies[i].body);
}

function addToWorld()
{
    scene = cgl.frameStore.currentScene;
    if (!scene || !cgl.frameStore.ammoWorld) return;

    if (world != cgl.frameStore.ammoWorld || currentSceneLoaded != scene.loaded) removeFromWorld();

    world = cgl.frameStore.ammoWorld;

    if (!world)
    {
        op.logError("no physics world!?");
        outNum.set(0);
        return;
    }
    if (!scene) return;

    currentSceneLoaded = scene.loaded;
    for (let i = 0; i < scene.nodes.length; i++)
    {
        if (!scene.nodes[i].mesh) continue;
        if (scene.nodes[i].name.indexOf(inNames.get()) == -1) continue;

        let colShape = null;

        scene.nodes[i].transform(cgl, 0);
        scene.nodes[i].updateMatrix();

        const sc = scene.nodes[i]._scale || [1, 1, 1];
        const geom = scene.nodes[i].mesh.meshes[0].geom;

        if (inShape.get() == "Convex Hull")
        {
            colShape = CABLES.AmmoWorld.createConvexHullFromGeom(geom, 100, sc);
        }
        else
        {
            let mesh = new Ammo.btTriangleMesh(true, true);

            for (let i = 0; i < geom.verticesIndices.length / 3; i++)
            {
                mesh.addTriangle(
                    new Ammo.btVector3(
                        sc[0] * geom.vertices[geom.verticesIndices[i * 3] * 3 + 0],
                        sc[0] * geom.vertices[geom.verticesIndices[i * 3] * 3 + 1],
                        sc[0] * geom.vertices[geom.verticesIndices[i * 3] * 3 + 2]
                    ),
                    new Ammo.btVector3(
                        sc[0] * geom.vertices[geom.verticesIndices[i * 3 + 1] * 3 + 0],
                        sc[0] * geom.vertices[geom.verticesIndices[i * 3 + 1] * 3 + 1],
                        sc[0] * geom.vertices[geom.verticesIndices[i * 3 + 1] * 3 + 2]
                    ),
                    new Ammo.btVector3(
                        sc[0] * geom.vertices[geom.verticesIndices[i * 3 + 2] * 3 + 0],
                        sc[0] * geom.vertices[geom.verticesIndices[i * 3 + 2] * 3 + 1],
                        sc[0] * geom.vertices[geom.verticesIndices[i * 3 + 2] * 3 + 2]
                    ),
                    false);
            }

            colShape = new Ammo.btBvhTriangleMeshShape(mesh, true, true);
        }

        colShape.setMargin(0.05);

        let localInertia = new Ammo.btVector3(0, 0, 0);
        colShape.calculateLocalInertia(inMass.get(), localInertia);

        let transform = new Ammo.btTransform();
        let motionState = new Ammo.btDefaultMotionState(transform);

        let rbInfo = new Ammo.btRigidBodyConstructionInfo(inMass.get(), motionState, colShape, localInertia);
        let body = new Ammo.btRigidBody(rbInfo);
        world.addRigidBody(body);

        world.setBodyMeta(body,
            {
                "name": scene.nodes[i].name,
                "mass": inMass.get(),

            });

        bodies.push(
            {
                "node": scene.nodes[i],
                "motionState": motionState,
                "body": body
            });
    }

    outNum.set(bodies.length);

    added = true;
}

}
};

CABLES.OPS["ea7553aa-0836-4512-9253-34b86d62accc"]={f:Ops.Extension.AmmoPhysics.GltfAmmoBodies,objName:"Ops.Extension.AmmoPhysics.GltfAmmoBodies"};




// **************************************************************
// 
// Ops.Gl.Pbr.PbrMaterial
// 
// **************************************************************

Ops.Gl.Pbr.PbrMaterial= class extends CABLES.Op 
{
constructor()
{
super(...arguments);
const op=this;
const attachments=op.attachments={"BasicPBR_frag":"precision highp float;\r\nprecision highp int;\r\n{{MODULES_HEAD}}\r\n\r\n#ifndef PI\r\n#define PI 3.14159265358\r\n#endif\r\n\r\n// set by cables\r\nUNI vec3 camPos;\r\n// utility maps\r\n#ifdef USE_ENVIRONMENT_LIGHTING\r\n    UNI sampler2D IBL_BRDF_LUT;\r\n#endif\r\n// mesh maps\r\n#ifdef USE_ALBEDO_TEX\r\n    UNI sampler2D _AlbedoMap;\r\n#else\r\n    UNI vec4 _Albedo;\r\n#endif\r\n#ifdef USE_NORMAL_TEX\r\n    UNI sampler2D _NormalMap;\r\n#endif\r\n#ifdef USE_EMISSION\r\n    UNI sampler2D _EmissionMap;\r\n#endif\r\n#ifdef USE_HEIGHT_TEX\r\n    UNI sampler2D _HeightMap;\r\n#endif\r\n#ifdef USE_THIN_FILM_MAP\r\n    UNI sampler2D _ThinFilmMap;\r\n    UNI float _TFThicknessTexMin;\r\n    UNI float _TFThicknessTexMax;\r\n#endif\r\n#ifdef USE_AORM_TEX\r\n    UNI sampler2D _AORMMap;\r\n#else\r\n    UNI float _Roughness;\r\n    UNI float _Metalness;\r\n#endif\r\n#ifdef USE_LIGHTMAP\r\n    #ifndef VERTEX_COLORS\r\n        UNI sampler2D _Lightmap;\r\n    #else\r\n        #ifndef VCOL_LIGHTMAP\r\n            UNI sampler2D _Lightmap;\r\n        #endif\r\n    #endif\r\n#endif\r\n#ifdef USE_CLEAR_COAT\r\n    UNI float _ClearCoatIntensity;\r\n    UNI float _ClearCoatRoughness;\r\n    #ifdef USE_CC_NORMAL_MAP\r\n        #ifndef USE_NORMAL_MAP_FOR_CC\r\n            UNI sampler2D _CCNormalMap;\r\n        #endif\r\n    #endif\r\n#endif\r\n#ifdef USE_THIN_FILM\r\n    UNI float _ThinFilmIntensity;\r\n    UNI float _ThinFilmIOR;\r\n    UNI float _ThinFilmThickness;\r\n#endif\r\n// IBL inputs\r\n#ifdef USE_ENVIRONMENT_LIGHTING\r\n    UNI samplerCube _irradiance;\r\n    UNI samplerCube _prefilteredEnvironmentColour;\r\n    UNI float MAX_REFLECTION_LOD;\r\n    UNI float diffuseIntensity;\r\n    UNI float specularIntensity;\r\n    UNI float envIntensity;\r\n#endif\r\n#ifdef USE_LIGHTMAP\r\n    UNI float lightmapIntensity;\r\n#endif\r\nUNI float tonemappingExposure;\r\n#ifdef USE_HEIGHT_TEX\r\n    UNI float _HeightDepth;\r\n    #ifndef USE_OPTIMIZED_HEIGHT\r\n        UNI mat4 modelMatrix;\r\n    #endif\r\n#endif\r\n#ifdef USE_PARALLAX_CORRECTION\r\n    UNI vec3 _PCOrigin;\r\n    UNI vec3 _PCboxMin;\r\n    UNI vec3 _PCboxMax;\r\n#endif\r\n#ifdef USE_EMISSION\r\n    UNI float _EmissionIntensity;\r\n#endif\r\nIN vec2 texCoord;\r\n#ifdef USE_LIGHTMAP\r\n    #ifndef ATTRIB_texCoord1\r\n    #ifndef VERTEX_COLORS\r\n        IN vec2 texCoord1;\r\n    #else\r\n        #ifndef VCOL_LIGHTMAP\r\n            IN vec2 texCoord1;\r\n        #endif\r\n    #endif\r\n    #endif\r\n#endif\r\nIN vec4 FragPos;\r\nIN mat3 TBN;\r\nIN vec3 norm;\r\nIN vec3 normM;\r\n#ifdef VERTEX_COLORS\r\n    IN vec4 vertCol;\r\n#endif\r\n#ifdef USE_HEIGHT_TEX\r\n    #ifdef USE_OPTIMIZED_HEIGHT\r\n        IN vec3 fragTangentViewDir;\r\n    #else\r\n        IN mat3 invTBN;\r\n    #endif\r\n#endif\r\n\r\n\r\n// structs\r\nstruct Light {\r\n    vec3 color;\r\n    vec3 position;\r\n    vec3 specular;\r\n\r\n    #define INTENSITY x\r\n    #define ATTENUATION y\r\n    #define FALLOFF z\r\n    #define RADIUS w\r\n    vec4 lightProperties;\r\n\r\n    int castLight;\r\n\r\n    vec3 conePointAt;\r\n    #define COSCONEANGLE x\r\n    #define COSCONEANGLEINNER y\r\n    #define SPOTEXPONENT z\r\n    vec3 spotProperties;\r\n};\r\n\r\n\r\n#ifdef WEBGL1\r\n    #ifdef GL_EXT_shader_texture_lod\r\n        #define textureLod textureCubeLodEXT\r\n    #endif\r\n#endif\r\n#define SAMPLETEX textureLod\r\n\r\n// https://community.khronos.org/t/addition-of-two-hdr-rgbe-values/55669\r\nhighp vec4 EncodeRGBE8(highp vec3 rgb)\r\n{\r\n    highp vec4 vEncoded;\r\n    float maxComponent = max(max(rgb.r, rgb.g), rgb.b);\r\n    float fExp = ceil(log2(maxComponent));\r\n    vEncoded.rgb = rgb / exp2(fExp);\r\n    vEncoded.a = (fExp + 128.0) / 255.0;\r\n    return vEncoded;\r\n}\r\n// https://enkimute.github.io/hdrpng.js/\r\nhighp vec3 DecodeRGBE8(highp vec4 rgbe)\r\n{\r\n    highp vec3 vDecoded = rgbe.rgb * pow(2.0, rgbe.a * 255.0-128.0);\r\n    return vDecoded;\r\n}\r\n\r\n// from https://github.com/BabylonJS/Babylon.js/blob/master/src/Shaders/ShadersInclude/pbrIBLFunctions.fx\r\nfloat environmentRadianceOcclusion(float ambientOcclusion, float NdotVUnclamped) {\r\n    // Best balanced (implementation time vs result vs perf) analytical environment specular occlusion found.\r\n    // http://research.tri-ace.com/Data/cedec2011_RealtimePBR_Implementation_e.pptx\r\n    float temp = NdotVUnclamped + ambientOcclusion;\r\n    return clamp(temp * temp - 1.0 + ambientOcclusion, 0.0, 1.0);\r\n}\r\nfloat environmentHorizonOcclusion(vec3 view, vec3 normal, vec3 geometricNormal) {\r\n    // http://marmosetco.tumblr.com/post/81245981087\r\n    vec3 reflection = reflect(view, normal);\r\n    float temp = clamp(1.0 + 1.1 * dot(reflection, geometricNormal), 0.0, 1.0);\r\n    return temp * temp;\r\n}\r\n#ifdef ALPHA_DITHERED\r\n// from https://github.com/google/filament/blob/main/shaders/src/dithering.fs\r\n// modified to use this to discard based on factor instead of dithering\r\nfloat interleavedGradientNoise(highp vec2 n) {\r\n    return fract(52.982919 * fract(dot(vec2(0.06711, 0.00584), n)));\r\n}\r\nfloat Dither_InterleavedGradientNoise(float a) {\r\n    // Jimenez 2014, \"Next Generation Post-Processing in Call of Duty\"\r\n    highp vec2 uv = gl_FragCoord.xy;\r\n\r\n    // The noise variable must be highp to workaround Adreno bug #1096.\r\n    highp float noise = interleavedGradientNoise(uv);\r\n\r\n    return step(noise, a);\r\n}\r\n#endif\r\n\r\n#ifdef USE_HEIGHT_TEX\r\n#ifndef WEBGL1\r\n// based on Jasper Flicks great tutorials (:\r\nfloat getSurfaceHeight(sampler2D surfaceHeightMap, vec2 UV)\r\n{\r\n\treturn texture(surfaceHeightMap, UV).r;\r\n}\r\n\r\nvec2 RaymarchedParallax(vec2 UV, sampler2D surfaceHeightMap, float strength, vec3 viewDir)\r\n{\r\n    #ifndef USE_OPTIMIZED_HEIGHT\r\n\t#define PARALLAX_RAYMARCHING_STEPS 50\r\n    #else\r\n    #define PARALLAX_RAYMARCHING_STEPS 20\r\n    #endif\r\n\tvec2 uvOffset = vec2(0.0);\r\n\tfloat stepSize = 1.0 / float(PARALLAX_RAYMARCHING_STEPS);\r\n\tvec2 uvDelta = vec2(viewDir * (stepSize * strength));\r\n\tfloat stepHeight = 1.0;\r\n\tfloat surfaceHeight = getSurfaceHeight(surfaceHeightMap, UV);\r\n\r\n\tvec2 prevUVOffset = uvOffset;\r\n\tfloat prevStepHeight = stepHeight;\r\n\tfloat prevSurfaceHeight = surfaceHeight;\r\n\r\n    // doesnt work with webgl 1.0 as the && condition is not fixed length for loop\r\n\tfor (int i = 1; i < PARALLAX_RAYMARCHING_STEPS && stepHeight > surfaceHeight; ++i)\r\n\t{\r\n\t\tprevUVOffset = uvOffset;\r\n\t\tprevStepHeight = stepHeight;\r\n\t\tprevSurfaceHeight = surfaceHeight;\r\n\r\n\t\tuvOffset -= uvDelta;\r\n\t\tstepHeight -= stepSize;\r\n\t\tsurfaceHeight = getSurfaceHeight(surfaceHeightMap, UV + uvOffset);\r\n\t}\r\n\r\n\tfloat prevDifference = prevStepHeight - prevSurfaceHeight;\r\n\tfloat difference = surfaceHeight - stepHeight;\r\n\tfloat t = prevDifference / (prevDifference + difference);\r\n\tuvOffset = mix(prevUVOffset, uvOffset, t);\r\n\treturn uvOffset;\r\n}\r\n#endif // TODO: use non raymarched parallax mapping here if webgl 1.0?\r\n#endif\r\n\r\n#ifdef USE_PARALLAX_CORRECTION\r\nvec3 BoxProjection(vec3 direction, vec3 position, vec3 cubemapPosition, vec3 boxMin, vec3 boxMax)\r\n{\r\n\tboxMin -= position;\r\n\tboxMax -= position;\r\n\tfloat x = (direction.x > 0.0 ? boxMax.x : boxMin.x) / direction.x;\r\n\tfloat y = (direction.y > 0.0 ? boxMax.y : boxMin.y) / direction.y;\r\n\tfloat z = (direction.z > 0.0 ? boxMax.z : boxMin.z) / direction.z;\r\n\tfloat scalar = min(min(x, y), z);\r\n\r\n\treturn direction * scalar + (position - cubemapPosition);\r\n}\r\n#endif\r\n\r\n#ifdef USE_THIN_FILM\r\n// section from https://github.com/BabylonJS/Babylon.js/blob/8a5077e0efb4ba471d16f7cd010fe6124ea8d005/packages/dev/core/src/Shaders/ShadersInclude/pbrBRDFFunctions.fx\r\n// helper functions from https://github.com/BabylonJS/Babylon.js/blob/8a5077e0efb4ba471d16f7cd010fe6124ea8d005/packages/dev/core/src/Shaders/ShadersInclude/helperFunctions.fx\r\nfloat square(float value)\r\n{\r\n    return value * value;\r\n}\r\nvec3 square(vec3 value)\r\n{\r\n    return value * value;\r\n}\r\nfloat pow5(float value) {\r\n    float sq = value * value;\r\n    return sq * sq * value;\r\n}\r\nconst mat3 XYZ_TO_REC709 = mat3(\r\n     3.2404542, -0.9692660,  0.0556434,\r\n    -1.5371385,  1.8760108, -0.2040259,\r\n    -0.4985314,  0.0415560,  1.0572252\r\n);\r\n// Assume air interface for top\r\n// Note: We don't handle the case fresnel0 == 1\r\nvec3 getIORTfromAirToSurfaceR0(vec3 f0) {\r\n    vec3 sqrtF0 = sqrt(f0);\r\n    return (1. + sqrtF0) / (1. - sqrtF0);\r\n}\r\n\r\n// Conversion FO/IOR\r\nvec3 getR0fromIORs(vec3 iorT, float iorI) {\r\n    return square((iorT - vec3(iorI)) / (iorT + vec3(iorI)));\r\n}\r\n\r\nfloat getR0fromIORs(float iorT, float iorI) {\r\n    return square((iorT - iorI) / (iorT + iorI));\r\n}\r\n\r\n// Fresnel equations for dielectric/dielectric interfaces.\r\n// Ref: https://belcour.github.io/blog/research/publication/2017/05/01/brdf-thin-film.html\r\n// Evaluation XYZ sensitivity curves in Fourier space\r\nvec3 evalSensitivity(float opd, vec3 shift) {\r\n    float phase = 2.0 * PI * opd * 1.0e-9;\r\n\r\n    const vec3 val = vec3(5.4856e-13, 4.4201e-13, 5.2481e-13);\r\n    const vec3 pos = vec3(1.6810e+06, 1.7953e+06, 2.2084e+06);\r\n    const vec3 var = vec3(4.3278e+09, 9.3046e+09, 6.6121e+09);\r\n\r\n    vec3 xyz = val * sqrt(2.0 * PI * var) * cos(pos * phase + shift) * exp(-square(phase) * var);\r\n    xyz.x += 9.7470e-14 * sqrt(2.0 * PI * 4.5282e+09) * cos(2.2399e+06 * phase + shift[0]) * exp(-4.5282e+09 * square(phase));\r\n    xyz /= 1.0685e-7;\r\n\r\n    vec3 srgb = XYZ_TO_REC709 * xyz;\r\n    return srgb;\r\n}\r\n// from https://github.com/BabylonJS/Babylon.js/blob/8a5077e0efb4ba471d16f7cd010fe6124ea8d005/packages/dev/core/src/Shaders/ShadersInclude/pbrBRDFFunctions.fx\r\nvec3 fresnelSchlickGGX(float VdotH, vec3 reflectance0, vec3 reflectance90)\r\n{\r\n    return reflectance0 + (reflectance90 - reflectance0) * pow5(1.0 - VdotH);\r\n}\r\nfloat fresnelSchlickGGX(float VdotH, float reflectance0, float reflectance90)\r\n{\r\n    return reflectance0 + (reflectance90 - reflectance0) * pow5(1.0 - VdotH);\r\n}\r\nvec3 evalIridescence(float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0) {\r\n    vec3 I = vec3(1.0);\r\n\r\n    // Force iridescenceIOR -> outsideIOR when thinFilmThickness -> 0.0\r\n    float iridescenceIOR = mix(outsideIOR, eta2, smoothstep(0.0, 0.03, thinFilmThickness));\r\n    // Evaluate the cosTheta on the base layer (Snell law)\r\n    float sinTheta2Sq = square(outsideIOR / iridescenceIOR) * (1.0 - square(cosTheta1));\r\n\r\n    // Handle TIR:\r\n    float cosTheta2Sq = 1.0 - sinTheta2Sq;\r\n    if (cosTheta2Sq < 0.0) {\r\n        return I;\r\n    }\r\n\r\n    float cosTheta2 = sqrt(cosTheta2Sq);\r\n\r\n    // First interface\r\n    float R0 = getR0fromIORs(iridescenceIOR, outsideIOR);\r\n    float R12 = fresnelSchlickGGX(cosTheta1, R0, 1.);\r\n    float R21 = R12;\r\n    float T121 = 1.0 - R12;\r\n    float phi12 = 0.0;\r\n    if (iridescenceIOR < outsideIOR) phi12 = PI;\r\n    float phi21 = PI - phi12;\r\n\r\n    // Second interface\r\n    vec3 baseIOR = getIORTfromAirToSurfaceR0(clamp(baseF0, 0.0, 0.9999)); // guard against 1.0\r\n    vec3 R1 = getR0fromIORs(baseIOR, iridescenceIOR);\r\n    vec3 R23 = fresnelSchlickGGX(cosTheta2, R1, vec3(1.));\r\n    vec3 phi23 = vec3(0.0);\r\n    if (baseIOR[0] < iridescenceIOR) phi23[0] = PI;\r\n    if (baseIOR[1] < iridescenceIOR) phi23[1] = PI;\r\n    if (baseIOR[2] < iridescenceIOR) phi23[2] = PI;\r\n\r\n    // Phase shift\r\n    float opd = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;\r\n    vec3 phi = vec3(phi21) + phi23;\r\n\r\n    // Compound terms\r\n    vec3 R123 = clamp(R12 * R23, 1e-5, 0.9999);\r\n    vec3 r123 = sqrt(R123);\r\n    vec3 Rs = square(T121) * R23 / (vec3(1.0) - R123);\r\n\r\n    // Reflectance term for m = 0 (DC term amplitude)\r\n    vec3 C0 = R12 + Rs;\r\n    I = C0;\r\n\r\n    // Reflectance term for m > 0 (pairs of diracs)\r\n    vec3 Cm = Rs - T121;\r\n    for (int m = 1; m <= 2; ++m)\r\n    {\r\n        Cm *= r123;\r\n        vec3 Sm = 2.0 * evalSensitivity(float(m) * opd, float(m) * phi);\r\n        I += Cm * Sm;\r\n    }\r\n\r\n    // Since out of gamut colors might be produced, negative color values are clamped to 0.\r\n    return max(I, vec3(0.0));\r\n}\r\n#endif\r\n\r\n{{PBR_FRAGMENT_HEAD}}\r\nvoid main()\r\n{\r\n    vec4 col;\r\n\r\n    // set up interpolated vertex data\r\n    vec2 UV0             = texCoord;\r\n    #ifdef USE_LIGHTMAP\r\n        #ifndef VERTEX_COLORS\r\n            vec2 UV1             = texCoord1;\r\n        #else\r\n            #ifndef VCOL_LIGHTMAP\r\n                vec2 UV1             = texCoord1;\r\n            #endif\r\n        #endif\r\n    #endif\r\n    vec3 V               = normalize(camPos - FragPos.xyz);\r\n\r\n    #ifdef USE_HEIGHT_TEX\r\n        #ifndef USE_OPTIMIZED_HEIGHT\r\n            vec3 fragTangentViewDir = normalize(invTBN * (camPos - FragPos.xyz));\r\n        #endif\r\n        #ifndef WEBGL1\r\n            UV0 += RaymarchedParallax(UV0, _HeightMap, _HeightDepth * 0.1, fragTangentViewDir);\r\n        #endif\r\n    #endif\r\n\r\n    // load relevant mesh maps\r\n    #ifdef USE_ALBEDO_TEX\r\n        vec4 AlbedoMap   = texture(_AlbedoMap, UV0);\r\n    #else\r\n        vec4 AlbedoMap   = _Albedo;\r\n    #endif\r\n    #ifdef ALPHA_MASKED\r\n\tif ( AlbedoMap.a <= 0.5 )\r\n\t    discard;\r\n\t#endif\r\n\r\n\t#ifdef ALPHA_DITHERED\r\n\tif ( Dither_InterleavedGradientNoise(AlbedoMap.a) <= 0.5 )\r\n\t    discard;\r\n\t#endif\r\n\r\n    #ifdef USE_AORM_TEX\r\n        vec4 AORM        = texture(_AORMMap, UV0);\r\n    #else\r\n        vec4 AORM        = vec4(1.0, _Roughness, _Metalness, 1.0);\r\n    #endif\r\n    #ifdef USE_NORMAL_TEX\r\n        vec3 internalNormals = texture(_NormalMap, UV0).rgb;\r\n        internalNormals      = internalNormals * 2.0 - 1.0;\r\n        internalNormals      = normalize(TBN * internalNormals);\r\n    #else\r\n        vec3 internalNormals = normM;\r\n\r\n        #ifdef DOUBLE_SIDED\r\n            if(!gl_FrontFacing) internalNormals = internalNormals*-1.0;\r\n        #endif\r\n\r\n    #endif\r\n\t#ifdef USE_LIGHTMAP\r\n    \t#ifndef VERTEX_COLORS\r\n\t        #ifndef LIGHTMAP_IS_RGBE\r\n                vec3 Lightmap = texture(_Lightmap, UV1).rgb;\r\n            #else\r\n                vec3 Lightmap = DecodeRGBE8(texture(_Lightmap, UV1));\r\n            #endif\r\n        #else\r\n            #ifdef VCOL_LIGHTMAP\r\n                vec3 Lightmap = pow(vertCol.rgb, vec3(2.2));\r\n            #else\r\n  \t            #ifndef LIGHTMAP_IS_RGBE\r\n                    vec3 Lightmap = texture(_Lightmap, UV1).rgb;\r\n                #else\r\n                    vec3 Lightmap = DecodeRGBE8(texture(_Lightmap, UV1));\r\n                #endif\r\n            #endif\r\n        #endif\r\n    #endif\r\n    // initialize texture values\r\n    float AO             = AORM.r;\r\n    float specK          = AORM.g;\r\n    float metalness      = AORM.b;\r\n    vec3  N              = normalize(internalNormals);\r\n    vec3  albedo         = pow(AlbedoMap.rgb, vec3(2.2));\r\n\r\n    #ifdef VERTEX_COLORS\r\n        #ifdef VCOL_COLOUR\r\n            albedo.rgb *= pow(vertCol.rgb, vec3(2.2));\r\n            AlbedoMap.rgb *= pow(vertCol.rgb, vec3(2.2));\r\n        #endif\r\n        #ifdef VCOL_AORM\r\n            AO = vertCol.r;\r\n            specK = vertCol.g;\r\n            metalness = vertCol.b;\r\n        #endif\r\n        #ifdef VCOL_AO\r\n            AO = vertCol.r;\r\n        #endif\r\n        #ifdef VCOL_R\r\n            specK = vertCol.g;\r\n        #endif\r\n        #ifdef VCOL_M\r\n            metalness = vertCol.b;\r\n        #endif\r\n    #endif\r\n\r\n    // set up values for later calculations\r\n    float NdotV          = abs(dot(N, V));\r\n    vec3  F0             = mix(vec3(0.04), AlbedoMap.rgb, metalness);\r\n\r\n    #ifdef USE_THIN_FILM\r\n        #ifndef USE_THIN_FILM_MAP\r\n            vec3 iridescenceFresnel = evalIridescence(1.0, _ThinFilmIOR, NdotV, _ThinFilmThickness, F0);\r\n            F0 = mix(F0, iridescenceFresnel, _ThinFilmIntensity);\r\n        #else\r\n            vec3 ThinFilmParameters = texture(_ThinFilmMap, UV0).rgb;\r\n            vec3 iridescenceFresnel = evalIridescence(1.0, 1.0 / ThinFilmParameters.b, NdotV, mix(_TFThicknessTexMin, _TFThicknessTexMax, ThinFilmParameters.g), F0);\r\n            F0 = mix(F0, iridescenceFresnel, ThinFilmParameters.r);\r\n        #endif\r\n    #endif\r\n\r\n    #ifndef WEBGL1\r\n        #ifndef DONT_USE_GR\r\n            // from https://github.com/BabylonJS/Babylon.js/blob/5e6321d887637877d8b28b417410abbbeb651c6e/src/Shaders/ShadersInclude/pbrHelperFunctions.fx\r\n            // modified to fit variable names\r\n            #ifndef DONT_USE_NMGR\r\n                vec3 nDfdx = dFdx(normM.xyz);\r\n                vec3 nDfdy = dFdy(normM.xyz);\r\n            #else\r\n                vec3 nDfdx = dFdx(N.xyz) + dFdx(normM.xyz);\r\n                vec3 nDfdy = dFdy(N.xyz) + dFdy(normM.xyz);\r\n            #endif\r\n            float slopeSquare = max(dot(nDfdx, nDfdx), dot(nDfdy, nDfdy));\r\n\r\n            // Vive analytical lights roughness factor.\r\n            float geometricRoughnessFactor = pow(clamp(slopeSquare, 0.0, 1.0), 0.333);\r\n\r\n            specK = max(specK, geometricRoughnessFactor);\r\n            #endif\r\n        #endif\r\n\r\n    \t// IBL\r\n    \t// from https://github.com/google/filament/blob/df6a100fcba66d9c99328a49d41fe3adecc0165d/shaders/src/light_indirect.fs\r\n    \t// and https://github.com/google/filament/blob/df6a100fcba66d9c99328a49d41fe3adecc0165d/shaders/src/shading_lit.fs\r\n    \t// modified to fit structure/variable names\r\n    \t#ifdef USE_ENVIRONMENT_LIGHTING\r\n        \tvec2 envBRDF = texture(IBL_BRDF_LUT, vec2(NdotV, specK)).xy;\r\n        \tvec3 E = mix(envBRDF.xxx, envBRDF.yyy, F0);\r\n        #endif\r\n\r\n        float specOcclusion    = environmentRadianceOcclusion(AO, NdotV);\r\n        float horizonOcclusion = environmentHorizonOcclusion(-V, N, normM);\r\n\r\n        #ifdef USE_ENVIRONMENT_LIGHTING\r\n            float envSampleSpecK = specK * MAX_REFLECTION_LOD;\r\n            vec3  R = reflect(-V, N);\r\n\r\n            #ifdef USE_PARALLAX_CORRECTION\r\n                R = BoxProjection(R, FragPos.xyz, _PCOrigin, _PCboxMin, _PCboxMax);\r\n            #endif\r\n\r\n    \t    vec3 prefilteredEnvColour = DecodeRGBE8(SAMPLETEX(_prefilteredEnvironmentColour, R, envSampleSpecK)) * specularIntensity*envIntensity;\r\n\r\n        \tvec3 Fr = E * prefilteredEnvColour;\r\n        \tFr *= specOcclusion * horizonOcclusion * (1.0 + F0 * (1.0 / envBRDF.y - 1.0));\r\n        \tFr *= 1.0 + F0; // TODO: this might be wrong, figure this out\r\n\r\n        \t#ifdef USE_LIGHTMAP\r\n                vec3 IBLIrradiance = Lightmap * lightmapIntensity;\r\n            #else\r\n                vec3 IBLIrradiance = DecodeRGBE8(SAMPLETEX(_irradiance, N, 0.0)) * diffuseIntensity*envIntensity;\r\n        #endif\r\n\r\n\t    vec3 Fd = (1.0 - metalness) * albedo * IBLIrradiance * (1.0 - E) * AO;\r\n    #endif\r\n    vec3 directLighting = vec3(0.0);\r\n\r\n    {{PBR_FRAGMENT_BODY}}\r\n\r\n    // combine IBL\r\n    col.rgb = directLighting;\r\n    #ifdef USE_ENVIRONMENT_LIGHTING\r\n\r\n        col.rgb += Fr + Fd;\r\n\r\n        #ifdef USE_CLEAR_COAT\r\n            float CCEnvSampleSpecK = _ClearCoatRoughness * MAX_REFLECTION_LOD;\r\n            #ifndef USE_NORMAL_MAP_FOR_CC\r\n                #ifndef USE_CC_NORMAL_MAP\r\n                    vec3 CCR = reflect(-V, normM);\r\n                #else\r\n                    vec3 CCN = texture(_CCNormalMap, UV0).rgb;\r\n                    CCN      = CCN * 2.0 - 1.0;\r\n                    CCN      = normalize(TBN * CCN);\r\n                    vec3 CCR = reflect(-V, CCN);\r\n                #endif\r\n                #ifdef USE_PARALLAX_CORRECTION\r\n                    CCR = BoxProjection(CCR, FragPos.xyz, _PCOrigin, _PCboxMin, _PCboxMax);\r\n                #endif\r\n            #endif\r\n            #ifndef USE_NORMAL_MAP_FOR_CC\r\n        \t    vec3 CCPrefilteredEnvColour = DecodeRGBE8(SAMPLETEX(_prefilteredEnvironmentColour, CCR, CCEnvSampleSpecK));\r\n        \t#else\r\n        \t    vec3 CCPrefilteredEnvColour = DecodeRGBE8(SAMPLETEX(_prefilteredEnvironmentColour, R, CCEnvSampleSpecK));\r\n        \t#endif\r\n        \tvec3 CCFr = E * CCPrefilteredEnvColour;\r\n        \tCCFr *= specOcclusion * horizonOcclusion * (0.96 + (0.04 / envBRDF.y));\r\n        \tCCFr *= 1.04;\r\n        \tcol.rgb += CCFr * _ClearCoatIntensity*envIntensity;\r\n        #endif\r\n    #else\r\n        #ifdef USE_LIGHTMAP\r\n            col.rgb += (1.0 - metalness) * albedo * Lightmap * lightmapIntensity;\r\n        #endif\r\n    #endif\r\n    #ifdef USE_EMISSION\r\n    col.rgb += texture(_EmissionMap, UV0).rgb * _EmissionIntensity;\r\n    #endif\r\n    col.a   = 1.0;\r\n\r\n    #ifdef ALPHA_BLEND\r\n        col.a = AlbedoMap.a;\r\n    #endif\r\n\r\n    // from https://github.com/BabylonJS/Babylon.js/blob/5e6321d887637877d8b28b417410abbbeb651c6e/src/Shaders/tonemap.fragment.fx\r\n    // modified to fit variable names\r\n    #ifdef TONEMAP_HejiDawson\r\n        col.rgb *= tonemappingExposure;\r\n\r\n        vec3 X = max(vec3(0.0, 0.0, 0.0), col.rgb - 0.004);\r\n        vec3 retColor = (X * (6.2 * X + 0.5)) / (X * (6.2 * X + 1.7) + 0.06);\r\n\r\n        col.rgb = retColor * retColor;\r\n    #elif defined(TONEMAP_Photographic)\r\n        col.rgb =  vec3(1.0, 1.0, 1.0) - exp2(-tonemappingExposure * col.rgb);\r\n    #else\r\n        col.rgb *= tonemappingExposure;\r\n        //col.rgb = clamp(col.rgb, vec3(0.0), vec3(1.0));\r\n    #endif\r\n\r\n    col.rgb = pow(col.rgb, vec3(1.0/2.2));\r\n    {{MODULE_COLOR}}\r\n\r\n    outColor = col;\r\n}\r\n","BasicPBR_vert":"precision highp float;\r\nprecision highp int;\r\n\r\nUNI vec3 camPos;\r\n\r\nIN vec3  vPosition;\r\nIN vec2  attrTexCoord;\r\n#ifdef USE_LIGHTMAP\r\n    #ifndef ATTRIB_attrTexCoord1\r\n        IN vec2 attrTexCoord1;\r\n        OUT vec2 texCoord1;\r\n        #define ATTRIB_attrTexCoord1\r\n        #define ATTRIB_texCoord1\r\n    #endif\r\n#endif\r\nIN vec3  attrVertNormal;\r\nIN vec3  attrTangent;\r\nIN vec3  attrBiTangent;\r\nIN float attrVertIndex;\r\n#ifdef VERTEX_COLORS\r\nIN vec4 attrVertColor;\r\n#endif\r\n\r\n{{MODULES_HEAD}}\r\n\r\nOUT vec2 texCoord;\r\n\r\nOUT vec4 FragPos;\r\nOUT mat3 TBN;\r\nOUT vec3 norm;\r\nOUT vec3 normM;\r\n#ifdef VERTEX_COLORS\r\nOUT vec4 vertCol;\r\n#endif\r\n#ifdef USE_HEIGHT_TEX\r\n#ifdef USE_OPTIMIZED_HEIGHT\r\nOUT vec3 fragTangentViewDir;\r\n#else\r\nOUT mat3 invTBN;\r\n#endif\r\n#endif\r\nUNI mat4 projMatrix;\r\nUNI mat4 viewMatrix;\r\nUNI mat4 modelMatrix;\r\n\r\nvoid main()\r\n{\r\n    mat4 mMatrix = modelMatrix; // needed to make vertex effects work\r\n    #ifdef USE_LIGHTMAP\r\n        texCoord1 = attrTexCoord1;\r\n    #endif\r\n    texCoord = attrTexCoord;\r\n    texCoord.y = 1.0 - texCoord.y;\r\n    vec4 pos = vec4(vPosition,  1.0);\r\n    norm = attrVertNormal;\r\n    vec3 tangent = attrTangent;\r\n    vec3 bitangent = attrBiTangent;\r\n\r\n    {{MODULE_VERTEX_POSITION}}\r\n\r\n\r\n    mat4 theMMat=mMatrix;\r\n    #ifdef INSTANCING\r\n        #ifdef TEXINSTMAT\r\n            theMMat = texInstMat;\r\n        #endif\r\n        #ifndef TEXINSTMAT\r\n            theMMat = instMat;\r\n        #endif\r\n    #endif\r\n\r\n    FragPos = theMMat * pos;\r\n\r\n    tangent = normalize(vec3(theMMat * vec4(tangent,    0.0)));\r\n    vec3 N = normalize(vec3(theMMat * vec4(norm, 0.0)));\r\n    bitangent = normalize(vec3(theMMat * vec4(bitangent,  0.0)));\r\n\r\n    #ifdef VERTEX_COLORS\r\n        vertCol = attrVertColor;\r\n    #endif\r\n\r\n    TBN = mat3(tangent, bitangent, N);\r\n\r\n    #ifdef USE_HEIGHT_TEX\r\n    #ifndef WEBGL1\r\n    #ifdef USE_OPTIMIZED_HEIGHT\r\n    fragTangentViewDir = normalize(transpose(TBN) * (camPos - FragPos.xyz));\r\n    #else\r\n    invTBN = transpose(TBN);\r\n    #endif\r\n    #endif\r\n    #endif\r\n\r\n    normM = N;\r\n\r\n    mat4 modelViewMatrix=viewMatrix*mMatrix;\r\n    {{MODULE_VERTEX_MODELVIEW}}\r\n\r\n    gl_Position = projMatrix * modelViewMatrix * pos;\r\n}\r\n","light_body_directional_frag":"\r\nvec3 L{{LIGHT_INDEX}} = normalize(lightOP{{LIGHT_INDEX}}.position);\r\n#ifdef USE_ENVIRONMENT_LIGHTING\r\ndirectLighting += evaluateLighting(lightOP{{LIGHT_INDEX}}, L{{LIGHT_INDEX}}, FragPos, V, N, albedo, specK, NdotV, F0, envBRDF.y, AO, false);\r\n#else\r\ndirectLighting += evaluateLighting(lightOP{{LIGHT_INDEX}}, L{{LIGHT_INDEX}}, FragPos, V, N, albedo, specK, NdotV, F0, AO, false);\r\n#endif\r\n","light_body_point_frag":"\r\nvec3 L{{LIGHT_INDEX}} = normalize(lightOP{{LIGHT_INDEX}}.position - FragPos.xyz);\r\n#ifdef USE_ENVIRONMENT_LIGHTING\r\ndirectLighting += evaluateLighting(lightOP{{LIGHT_INDEX}}, L{{LIGHT_INDEX}}, FragPos, V, N, albedo, specK, NdotV, F0, envBRDF.y, AO, true);\r\n#else\r\ndirectLighting += evaluateLighting(lightOP{{LIGHT_INDEX}}, L{{LIGHT_INDEX}}, FragPos, V, N, albedo, specK, NdotV, F0, AO, true);\r\n#endif\r\n","light_body_spot_frag":"\r\nvec3 L{{LIGHT_INDEX}} = normalize(lightOP{{LIGHT_INDEX}}.position - FragPos.xyz);\r\nfloat spotIntensity{{LIGHT_INDEX}} = CalculateSpotLightEffect(\r\n    lightOP{{LIGHT_INDEX}}.position, lightOP{{LIGHT_INDEX}}.conePointAt, lightOP{{LIGHT_INDEX}}.spotProperties.COSCONEANGLE,\r\n    lightOP{{LIGHT_INDEX}}.spotProperties.COSCONEANGLEINNER, lightOP{{LIGHT_INDEX}}.spotProperties.SPOTEXPONENT,\r\n    L{{LIGHT_INDEX}}\r\n);\r\n#ifdef USE_ENVIRONMENT_LIGHTING\r\ndirectLighting += evaluateLighting(lightOP{{LIGHT_INDEX}}, L{{LIGHT_INDEX}}, FragPos, V, N, albedo, specK, NdotV, F0, envBRDF.y, AO * spotIntensity{{LIGHT_INDEX}}, true);\r\n#else\r\ndirectLighting += evaluateLighting(lightOP{{LIGHT_INDEX}}, L{{LIGHT_INDEX}}, FragPos, V, N, albedo, specK, NdotV, F0, AO * spotIntensity{{LIGHT_INDEX}}, true);\r\n#endif\r\n","light_head_frag":"UNI Light lightOP{{LIGHT_INDEX}};\r\n","light_includes_frag":"#ifndef PI\r\n#define PI 3.14159265359\r\n#endif\r\n\r\n// from https://github.com/google/filament/blob/036bfa9b20d730bb8e5852ed449b024570167648/shaders/src/brdf.fs\r\n// modified to fit variable names / structure\r\nfloat F_Schlick(float f0, float f90, float VoH)\r\n{\r\n    return f0 + (f90 - f0) * pow(1.0 - VoH, 5.0);\r\n}\r\nvec3 F_Schlick(const vec3 f0, float VoH)\r\n{\r\n    float f = pow(1.0 - VoH, 5.0);\r\n    return f + f0 * (1.0 - f);\r\n}\r\nfloat Fd_Burley(float roughness, float NoV, float NoL, float LoH)\r\n{\r\n    // Burley 2012, \"Physically-Based Shading at Disney\"\r\n    float f90 = 0.5 + 2.0 * roughness * LoH * LoH;\r\n    float lightScatter = F_Schlick(1.0, f90, NoL);\r\n    float viewScatter  = F_Schlick(1.0, f90, NoV);\r\n    return lightScatter * viewScatter * (1.0 / PI);\r\n}\r\nfloat D_GGX(float roughness, float NoH, const vec3 h)\r\n{\r\n    float oneMinusNoHSquared = 1.0 - NoH * NoH;\r\n\r\n    float a = NoH * roughness;\r\n    float k = roughness / (oneMinusNoHSquared + a * a);\r\n    float d = k * k * (1.0 / PI);\r\n    return clamp(d, 0.0, 1.0);\r\n}\r\nfloat V_SmithGGXCorrelated(float roughness, float NoV, float NoL)\r\n{\r\n    // Heitz 2014, \"Understanding the Masking-Shadowing Function in Microfacet-Based BRDFs\"\r\n    float a2 = roughness * roughness;\r\n    // TODO: lambdaV can be pre-computed for all the lights, it should be moved out of this function\r\n    float lambdaV = NoL * sqrt((NoV - a2 * NoV) * NoV + a2);\r\n    float lambdaL = NoV * sqrt((NoL - a2 * NoL) * NoL + a2);\r\n    float v = 0.5 / (lambdaV + lambdaL);\r\n    // a2=0 => v = 1 / 4*NoL*NoV   => min=1/4, max=+inf\r\n    // a2=1 => v = 1 / 2*(NoL+NoV) => min=1/4, max=+inf\r\n    // clamp to the maximum value representable in mediump\r\n    return clamp(v, 0.0, 1.0);\r\n}\r\n// from https://github.com/google/filament/blob/73e339b05d67749e3b1d1d243650441162c10f8a/shaders/src/light_punctual.fs\r\n// modified to fit variable names\r\nfloat getSquareFalloffAttenuation(float distanceSquare, float falloff)\r\n{\r\n    float factor = distanceSquare * falloff;\r\n    float smoothFactor = clamp(1.0 - factor * factor, 0.0, 1.0);\r\n    // We would normally divide by the square distance here\r\n    // but we do it at the call site\r\n    return smoothFactor * smoothFactor;\r\n}\r\n\r\nfloat getDistanceAttenuation(vec3 posToLight, float falloff, vec3 V, float volume)\r\n{\r\n    float distanceSquare = dot(posToLight, posToLight);\r\n    float attenuation = getSquareFalloffAttenuation(distanceSquare, falloff);\r\n    // light far attenuation\r\n    float d = dot(V, V);\r\n    float f = 100.0; // CONFIG_Z_LIGHT_FAR, ttps://github.com/google/filament/blob/df6a100fcba66d9c99328a49d41fe3adecc0165d/filament/src/details/Engine.h\r\n    vec2 lightFarAttenuationParams = 0.5 * vec2(10.0, 10.0 / (f * f));\r\n    attenuation *= clamp(lightFarAttenuationParams.x - d * lightFarAttenuationParams.y, 0.0, 1.0);\r\n    // Assume a punctual light occupies a min volume of 1cm to avoid a division by 0\r\n    return attenuation / max(distanceSquare, max(1e-4, volume));\r\n}\r\n\r\n#ifdef USE_CLEAR_COAT\r\n// from https://github.com/google/filament/blob/73e339b05d67749e3b1d1d243650441162c10f8a/shaders/src/shading_model_standard.fs\r\n// modified to fit variable names / structure\r\nfloat clearCoatLobe(vec3 shading_clearCoatNormal, vec3 h, float LoH, float CCSpecK)\r\n{\r\n    float clearCoatNoH = clamp(dot(shading_clearCoatNormal, h), 0.0, 1.0);\r\n\r\n    // clear coat specular lobe\r\n    float D = D_GGX(CCSpecK, clearCoatNoH, h);\r\n    // from https://github.com/google/filament/blob/036bfa9b20d730bb8e5852ed449b024570167648/shaders/src/brdf.fs\r\n    float V = clamp(0.25 / (LoH * LoH), 0.0, 1.0);\r\n    float F = F_Schlick(0.04, 1.0, LoH); // fix IOR to 1.5\r\n\r\n    return D * V * F;\r\n}\r\n#endif\r\n\r\n#ifdef USE_ENVIRONMENT_LIGHTING\r\nvec3 evaluateLighting(Light light, vec3 L, vec4 FragPos, vec3 V, vec3 N, vec3 albedo, float specK, float NdotV, vec3 F0, float envBRDFY, float AO, bool hasFalloff)\r\n#else\r\nvec3 evaluateLighting(Light light, vec3 L, vec4 FragPos, vec3 V, vec3 N, vec3 albedo, float specK, float NdotV, vec3 F0, float AO, bool hasFalloff)\r\n#endif\r\n{\r\n    vec3 directLightingResult = vec3(0.0);\r\n    if (light.castLight == 1)\r\n    {\r\n        specK = max(0.08, specK);\r\n        // from https://github.com/google/filament/blob/73e339b05d67749e3b1d1d243650441162c10f8a/shaders/src/shading_model_standard.fs\r\n        // modified to fit variable names / structure\r\n        vec3 H = normalize(V + L);\r\n\r\n        float NdotL = clamp(dot(N, L), 0.0, 1.0);\r\n        float NdotH = clamp(dot(N, H), 0.0, 1.0);\r\n        float LdotH = clamp(dot(L, H), 0.0, 1.0);\r\n\r\n        vec3 Fd = albedo * Fd_Burley(specK, NdotV, NdotL, LdotH);\r\n\r\n        float D  = D_GGX(specK, NdotH, H);\r\n        float V2 = V_SmithGGXCorrelated(specK, NdotV, NdotL);\r\n        vec3  F  = F_Schlick(F0, LdotH);\r\n\r\n        // TODO: modify this with the radius\r\n        vec3 Fr = (D * V2) * F;\r\n\r\n        #ifdef USE_ENVIRONMENT_LIGHTING\r\n        vec3 directLighting = Fd + Fr * (1.0 + F0 * (1.0 / envBRDFY - 1.0));\r\n        #else\r\n        vec3 directLighting = Fd + Fr;\r\n        #endif\r\n\r\n        float attenuation = getDistanceAttenuation(L, hasFalloff ? light.lightProperties.FALLOFF : 0.0, V, light.lightProperties.RADIUS);\r\n\r\n        directLightingResult = (directLighting * light.color) *\r\n                          (light.lightProperties.INTENSITY * attenuation * NdotL * AO);\r\n\r\n        #ifdef USE_CLEAR_COAT\r\n        directLightingResult += clearCoatLobe(normM, H, LdotH, _ClearCoatRoughness);\r\n        #endif\r\n    }\r\n    return directLightingResult;\r\n}\r\n\r\n// from phong OP to make sure the light parameters change lighting similar to what people are used to\r\nfloat CalculateSpotLightEffect(vec3 lightPosition, vec3 conePointAt, float cosConeAngle, float cosConeAngleInner, float spotExponent, vec3 lightDirection) {\r\n    vec3 spotLightDirection = normalize(lightPosition-conePointAt);\r\n    float spotAngle = dot(-lightDirection, spotLightDirection);\r\n    float epsilon = cosConeAngle - cosConeAngleInner;\r\n\r\n    float spotIntensity = clamp((spotAngle - cosConeAngle)/epsilon, 0.0, 1.0);\r\n    spotIntensity = pow(spotIntensity, max(0.01, spotExponent));\r\n\r\n    return max(0., spotIntensity);\r\n}\r\n",};
// utility
const cgl = op.patch.cgl;
// inputs
const inTrigger = op.inTrigger("render");

const inDiffuseR = op.inFloat("R", Math.random());
const inDiffuseG = op.inFloat("G", Math.random());
const inDiffuseB = op.inFloat("B", Math.random());
const inDiffuseA = op.inFloatSlider("A", 1);
const diffuseColors = [inDiffuseR, inDiffuseG, inDiffuseB, inDiffuseA];
op.setPortGroup("Diffuse Color", diffuseColors);

const inRoughness = op.inFloatSlider("Roughness", 0.5);
const inMetalness = op.inFloatSlider("Metalness", 0.0);
const inAlphaMode = op.inSwitch("Alpha Mode", ["Opaque", "Masked", "Dithered", "Blend"], "Blend");

const inUseClearCoat = op.inValueBool("Use Clear Coat", false);
const inClearCoatIntensity = op.inFloatSlider("Clear Coat Intensity", 1.0);
const inClearCoatRoughness = op.inFloatSlider("Clear Coat Roughness", 0.5);
const inUseNormalMapForCC = op.inValueBool("Use Normal map for Clear Coat", false);
const inTexClearCoatNormal = op.inTexture("Clear Coat Normal map");

const inUseThinFilm = op.inValueBool("Use Thin Film", false);
const inThinFilmIntensity = op.inFloatSlider("Thin Film Intensity", 1.0);
const inThinFilmIOR = op.inFloat("Thin Film IOR", 1.3);
const inThinFilmThickness = op.inFloat("Thin Film Thickness (nm)", 600.0);

const inTFThicknessTexMin = op.inFloat("Thickness Tex Min", 300.0);
const inTFThicknessTexMax = op.inFloat("Thickness Tex Max", 600.0);

const inTonemapping = op.inSwitch("Tonemapping", ["sRGB", "HejiDawson", "Photographic"], "sRGB");
const inTonemappingExposure = op.inFloat("Exposure", 1.0);

const inEmissionIntensity = op.inFloat("Emission Intensity", 1.0);
const inToggleGR = op.inBool("Disable geometric roughness", false);
const inToggleNMGR = op.inBool("Use roughness from normal map", false);
const inUseVertexColours = op.inValueBool("Use Vertex Colours", false);
const inVertexColourMode = op.inSwitch("Vertex Colour Mode", ["colour", "AORM", "AO", "R", "M", "lightmap"], "colour");
const inHeightDepth = op.inFloat("Height Intensity", 1.0);
const inUseOptimizedHeight = op.inValueBool("Faster heightmapping", false);
const inDoubleSided = op.inValueBool("Double Sided", false);

// texture inputs
const inTexIBLLUT = op.inTexture("IBL LUT");
const inTexIrradiance = op.inTexture("Diffuse Irradiance");
const inTexPrefiltered = op.inTexture("Pre-filtered envmap");
const inMipLevels = op.inInt("Num mip levels");

const inTexAlbedo = op.inTexture("Albedo");
const inTexAORM = op.inTexture("AORM");
const inTexNormal = op.inTexture("Normal map");
const inTexEmission = op.inTexture("Emission");
const inTexHeight = op.inTexture("Height");
const inLightmap = op.inTexture("Lightmap");
const inTexThinFilm = op.inTexture("Thin Film");

const inDiffuseIntensity = op.inFloat("Diffuse Intensity", 1.0);
const inSpecularIntensity = op.inFloat("Specular Intensity", 1.0);
const inLightmapRGBE = op.inBool("Lightmap is RGBE", false);
const inLightmapIntensity = op.inFloat("Lightmap Intensity", 1.0);

inTrigger.onTriggered = doRender;

// outputs
const outTrigger = op.outTrigger("Next");
const shaderOut = op.outObject("Shader");
shaderOut.ignoreValueSerialize = true;
// UI stuff
op.toWorkPortsNeedToBeLinked(inTrigger);
op.toWorkShouldNotBeChild("Ops.Gl.TextureEffects.ImageCompose", CABLES.OP_PORT_TYPE_FUNCTION);

inDiffuseR.setUiAttribs({ "colorPick": true });
op.setPortGroup("Shader Parameters", [inRoughness, inMetalness, inAlphaMode]);
op.setPortGroup("Advanced Shader Parameters", [inEmissionIntensity, inToggleGR, inToggleNMGR, inUseVertexColours, inVertexColourMode, inHeightDepth, inUseOptimizedHeight, inDoubleSided]);
op.setPortGroup("Textures", [inTexAlbedo, inTexAORM, inTexNormal, inTexEmission, inTexHeight, inLightmap, inTexThinFilm]);
op.setPortGroup("Lighting", [inDiffuseIntensity, inSpecularIntensity, inLightmapIntensity, inLightmapRGBE, inTexIBLLUT, inTexIrradiance, inTexPrefiltered, inMipLevels]);
op.setPortGroup("Tonemapping", [inTonemapping, inTonemappingExposure]);
op.setPortGroup("Clear Coat", [inUseClearCoat, inClearCoatIntensity, inClearCoatRoughness, inUseNormalMapForCC, inTexClearCoatNormal]);
op.setPortGroup("Thin Film Iridescence", [inUseThinFilm, inThinFilmIntensity, inThinFilmIOR, inThinFilmThickness, inTFThicknessTexMin, inTFThicknessTexMax]);
// globals
let PBRShader = new CGL.Shader(cgl, "PBRShader", this);
PBRShader.setModules(["MODULE_VERTEX_POSITION", "MODULE_COLOR", "MODULE_BEGIN_FRAG", "MODULE_VERTEX_MODELVIEW"]);

// light sources (except IBL)
let PBRLightStack = [];
const lightUniforms = [];
const LIGHT_INDEX_REGEX = new RegExp("{{LIGHT_INDEX}}", "g");
const FRAGMENT_HEAD_REGEX = new RegExp("{{PBR_FRAGMENT_HEAD}}", "g");
const FRAGMENT_BODY_REGEX = new RegExp("{{PBR_FRAGMENT_BODY}}", "g");
const lightFragmentHead = attachments.light_head_frag;
const lightFragmentBodies = {
    "point": attachments.light_body_point_frag,
    "directional": attachments.light_body_directional_frag,
    "spot": attachments.light_body_spot_frag,
};
const createLightFragmentHead = (n) => { return lightFragmentHead.replace("{{LIGHT_INDEX}}", n); };
const createLightFragmentBody = (n, type) =>
{ return (lightFragmentBodies[type] || "").replace(LIGHT_INDEX_REGEX, n); };
let currentLightCount = -1;
const defaultLightStack = [{
    "type": "point",
    "position": [5, 5, 5],
    "color": [1, 1, 1],
    "specular": [1, 1, 1],
    "intensity": 120,
    "attenuation": 0,
    "falloff": 0.5,
    "radius": 60,
    "castLight": 1,
}];

if (cgl.glVersion == 1)
{
    if (!cgl.gl.getExtension("EXT_shader_texture_lod"))
    {
        op.log("no EXT_shader_texture_lod texture extension");
        throw "no EXT_shader_texture_lod texture extension";
    }
    else
    {
        PBRShader.enableExtension("GL_EXT_shader_texture_lod");
        cgl.gl.getExtension("OES_texture_float");
        cgl.gl.getExtension("OES_texture_float_linear");
        cgl.gl.getExtension("OES_texture_half_float");
        cgl.gl.getExtension("OES_texture_half_float_linear");

        PBRShader.enableExtension("GL_OES_standard_derivatives");
        PBRShader.enableExtension("GL_OES_texture_float");
        PBRShader.enableExtension("GL_OES_texture_float_linear");
        PBRShader.enableExtension("GL_OES_texture_half_float");
        PBRShader.enableExtension("GL_OES_texture_half_float_linear");
    }
}

buildShader();
// uniforms

const inAlbedoUniform = new CGL.Uniform(PBRShader, "t", "_AlbedoMap", 0);
const inAORMUniform = new CGL.Uniform(PBRShader, "t", "_AORMMap", 0);
const inNormalUniform = new CGL.Uniform(PBRShader, "t", "_NormalMap", 0);
const inEmissionUniform = new CGL.Uniform(PBRShader, "t", "_EmissionMap", 0);
const inCCNormalUniform = new CGL.Uniform(PBRShader, "t", "_CCNormalMap", 0);
const inIBLLUTUniform = new CGL.Uniform(PBRShader, "t", "IBL_BRDF_LUT", 0);
const inIrradianceUniform = new CGL.Uniform(PBRShader, "tc", "_irradiance", 1);
const inPrefilteredUniform = new CGL.Uniform(PBRShader, "tc", "_prefilteredEnvironmentColour", 1);
const inMipLevelsUniform = new CGL.Uniform(PBRShader, "f", "MAX_REFLECTION_LOD", 0);

const inTonemappingExposureUniform = new CGL.Uniform(PBRShader, "f", "tonemappingExposure", inTonemappingExposure);
const inDiffuseIntensityUniform = new CGL.Uniform(PBRShader, "f", "diffuseIntensity", inDiffuseIntensity);
const inSpecularIntensityUniform = new CGL.Uniform(PBRShader, "f", "specularIntensity", inSpecularIntensity);
const inIntensity = new CGL.Uniform(PBRShader, "f", "envIntensity", 1);

const inHeightUniform = new CGL.Uniform(PBRShader, "t", "_HeightMap", 0);
const inLightmapUniform = new CGL.Uniform(PBRShader, "t", "_Lightmap", 0);
const inLightmapIntensityUniform = new CGL.Uniform(PBRShader, "f", "lightmapIntensity", inLightmapIntensity);
const inTexThinFilmUniform = new CGL.Uniform(PBRShader, "t", "_ThinFilmMap", 0);

const inDiffuseColor = new CGL.Uniform(PBRShader, "4f", "_Albedo", inDiffuseR, inDiffuseG, inDiffuseB, inDiffuseA);
const inRoughnessUniform = new CGL.Uniform(PBRShader, "f", "_Roughness", inRoughness);
const inMetalnessUniform = new CGL.Uniform(PBRShader, "f", "_Metalness", inMetalness);
const inHeightDepthUniform = new CGL.Uniform(PBRShader, "f", "_HeightDepth", inHeightDepth);
const inClearCoatIntensityUniform = new CGL.Uniform(PBRShader, "f", "_ClearCoatIntensity", inClearCoatIntensity);
const inClearCoatRoughnessUniform = new CGL.Uniform(PBRShader, "f", "_ClearCoatRoughness", inClearCoatRoughness);
const inEmissionIntensityUniform = new CGL.Uniform(PBRShader, "f", "_EmissionIntensity", inEmissionIntensity);

const inThinFilmIntensityUniform = new CGL.Uniform(PBRShader, "f", "_ThinFilmIntensity", inThinFilmIntensity);
const inThinFilmIORUniform = new CGL.Uniform(PBRShader, "f", "_ThinFilmIOR", inThinFilmIOR);
const inThinFilmThicknessUniform = new CGL.Uniform(PBRShader, "f", "_ThinFilmThickness", inThinFilmThickness);

const inTFThicknessTexMinUniform = new CGL.Uniform(PBRShader, "f", "_TFThicknessTexMin", inTFThicknessTexMin);
const inTFThicknessTexMaxUniform = new CGL.Uniform(PBRShader, "f", "_TFThicknessTexMax", inTFThicknessTexMax);

const inPCOrigin = new CGL.Uniform(PBRShader, "3f", "_PCOrigin", [0, 0, 0]);
const inPCboxMin = new CGL.Uniform(PBRShader, "3f", "_PCboxMin", [-1, -1, -1]);
const inPCboxMax = new CGL.Uniform(PBRShader, "3f", "_PCboxMax", [1, 1, 1]);

PBRShader.uniformColorDiffuse = inDiffuseColor;
PBRShader.uniformPbrMetalness = inMetalnessUniform;
PBRShader.uniformPbrRoughness = inRoughnessUniform;

inTexPrefiltered.onChange = updateIBLTexDefines;

inTexAORM.onChange =
    inDoubleSided.onChange =
    inLightmapRGBE.onChange =
    inUseNormalMapForCC.onChange =
    inUseClearCoat.onChange =
    inTexClearCoatNormal.onChange =
    inTexAlbedo.onChange =
    inTexNormal.onChange =
    inTexEmission.onChange =
    inTexHeight.onChange =
    inAlphaMode.onChange =
    inToggleNMGR.onChange =
    inTonemapping.onChange =
    inLightmap.onChange =
    inTexThinFilm.onChange =
    inUseOptimizedHeight.onChange =
    inUseVertexColours.onChange =
    inToggleGR.onChange =
    inUseThinFilm.onChange =
    inVertexColourMode.onChange = updateDefines;

function updateDefines()
{
    PBRShader.toggleDefine("DOUBLE_SIDED", inDoubleSided.get());
    PBRShader.toggleDefine("USE_OPTIMIZED_HEIGHT", inUseOptimizedHeight.get());
    PBRShader.toggleDefine("USE_CLEAR_COAT", inUseClearCoat.get());
    PBRShader.toggleDefine("USE_NORMAL_MAP_FOR_CC", inUseNormalMapForCC.get());
    PBRShader.toggleDefine("USE_CC_NORMAL_MAP", inTexClearCoatNormal.isLinked());
    PBRShader.toggleDefine("LIGHTMAP_IS_RGBE", inLightmapRGBE.get());
    PBRShader.toggleDefine("USE_LIGHTMAP", inLightmap.isLinked() || inVertexColourMode.get() === "lightmap");
    PBRShader.toggleDefine("USE_NORMAL_TEX", inTexNormal.isLinked());
    PBRShader.toggleDefine("USE_HEIGHT_TEX", inTexHeight.isLinked());
    PBRShader.toggleDefine("DONT_USE_NMGR", inToggleNMGR.get());
    PBRShader.toggleDefine("DONT_USE_GR", inToggleGR.get());
    PBRShader.toggleDefine("USE_THIN_FILM", inUseThinFilm.get());
    PBRShader.toggleDefine("USE_EMISSION", inTexEmission.get());
    PBRShader.toggleDefine("USE_THIN_FILM_MAP", inTexThinFilm.get());

    // VERTEX_COLORS
    PBRShader.toggleDefine("VCOL_COLOUR", inVertexColourMode.get() === "colour");
    PBRShader.toggleDefine("VCOL_AORM", inVertexColourMode.get() === "AORM");
    PBRShader.toggleDefine("VCOL_AO", inVertexColourMode.get() === "AO");
    PBRShader.toggleDefine("VCOL_R", inVertexColourMode.get() === "R");
    PBRShader.toggleDefine("VCOL_M", inVertexColourMode.get() === "M");
    PBRShader.toggleDefine("VCOL_LIGHTMAP", inVertexColourMode.get() === "lightmap");

    // ALBEDO TEX
    PBRShader.toggleDefine("USE_ALBEDO_TEX", inTexAlbedo.get());
    inDiffuseR.setUiAttribs({ "greyout": inTexAlbedo.isLinked() });
    inDiffuseG.setUiAttribs({ "greyout": inTexAlbedo.isLinked() });
    inDiffuseB.setUiAttribs({ "greyout": inTexAlbedo.isLinked() });
    inDiffuseA.setUiAttribs({ "greyout": inTexAlbedo.isLinked() });

    // AORM
    PBRShader.toggleDefine("USE_AORM_TEX", inTexAORM.get());
    inRoughness.setUiAttribs({ "greyout": inTexAORM.isLinked() });
    inMetalness.setUiAttribs({ "greyout": inTexAORM.isLinked() });

    // lightmaps
    PBRShader.toggleDefine("VERTEX_COLORS", inUseVertexColours.get());

    if (!inUseVertexColours.get())
    {
        PBRShader.toggleDefine("USE_LIGHTMAP", inLightmap.get());
    }
    else
    {
        if (inVertexColourMode.get() === "lightmap")
        {
            PBRShader.define("USE_LIGHTMAP");
        }
    }

    // alpha mode
    PBRShader.toggleDefine("ALPHA_MASKED", inAlphaMode.get() === "Masked");
    PBRShader.toggleDefine("ALPHA_DITHERED", inAlphaMode.get() === "Dithered");
    PBRShader.toggleDefine("ALPHA_BLEND", inAlphaMode.get() === "Blend");

    // tonemapping
    PBRShader.toggleDefine("TONEMAP_sRGB", inTonemapping.get() === "sRGB");
    PBRShader.toggleDefine("TONEMAP_HejiDawson", inTonemapping.get() === "HejiDawson");
    PBRShader.toggleDefine("TONEMAP_Photographic", inTonemapping.get() === "Photographic");
}

updateDefines();

function setEnvironmentLighting(enabled)
{
    PBRShader.toggleDefine("USE_ENVIRONMENT_LIGHTING", enabled);
}

function updateIBLTexDefines()
{
    inMipLevels.setUiAttribs({ "greyout": !inTexPrefiltered.get() });
}

function updateLightUniforms()
{
    for (let i = 0; i < PBRLightStack.length; i += 1)
    {
        const light = PBRLightStack[i];
        light.isUsed = true;

        lightUniforms[i].position.setValue(light.position);
        lightUniforms[i].color.setValue(light.color);
        lightUniforms[i].specular.setValue(light.specular);

        lightUniforms[i].lightProperties.setValue([
            light.intensity,
            light.attenuation,
            light.falloff,
            light.radius,
        ]);

        lightUniforms[i].conePointAt.setValue(light.conePointAt);
        lightUniforms[i].spotProperties.setValue([
            light.cosConeAngle,
            light.cosConeAngleInner,
            light.spotExponent,
        ]);

        lightUniforms[i].castLight.setValue(light.castLight);
    }
}

function buildShader()
{
    const vertexShader = attachments.BasicPBR_vert;
    const lightIncludes = attachments.light_includes_frag;
    let fragmentShader = attachments.BasicPBR_frag;

    let fragmentHead = "";
    let fragmentBody = "";

    if (PBRLightStack.length > 0)
    {
        fragmentHead = fragmentHead.concat(lightIncludes);
    }

    for (let i = 0; i < PBRLightStack.length; i += 1)
    {
        const light = PBRLightStack[i];
        const type = light.type;

        fragmentHead = fragmentHead.concat(createLightFragmentHead(i) || "");
        fragmentBody = fragmentBody.concat(createLightFragmentBody(i, light.type) || "");
    }

    fragmentShader = fragmentShader.replace(FRAGMENT_HEAD_REGEX, fragmentHead || "");
    fragmentShader = fragmentShader.replace(FRAGMENT_BODY_REGEX, fragmentBody || "");

    PBRShader.setSource(vertexShader, fragmentShader);
    shaderOut.set(PBRShader);

    for (let i = 0; i < PBRLightStack.length; i += 1)
    {
        lightUniforms[i] = null;
        if (!lightUniforms[i])
        {
            lightUniforms[i] = {
                "color": new CGL.Uniform(PBRShader, "3f", "lightOP" + i + ".color", [1, 1, 1]),
                "position": new CGL.Uniform(PBRShader, "3f", "lightOP" + i + ".position", [0, 11, 0]),
                "specular": new CGL.Uniform(PBRShader, "3f", "lightOP" + i + ".specular", [1, 1, 1]),
                "lightProperties": new CGL.Uniform(PBRShader, "4f", "lightOP" + i + ".lightProperties", [1, 1, 1, 1]),

                "conePointAt": new CGL.Uniform(PBRShader, "3f", "lightOP" + i + ".conePointAt", vec3.create()),
                "spotProperties": new CGL.Uniform(PBRShader, "3f", "lightOP" + i + ".spotProperties", [0, 0, 0, 0]),
                "castLight": new CGL.Uniform(PBRShader, "i", "lightOP" + i + ".castLight", 1),

            };
        }
    }
}

function updateLights()
{
    if (cgl.tempData.lightStack)
    {
        let changed = currentLightCount !== cgl.tempData.lightStack.length;

        if (!changed)
        {
            for (let i = 0; i < cgl.tempData.lightStack.length; i++)
            {
                if (PBRLightStack[i] != cgl.tempData.lightStack[i])
                {
                    changed = true;
                    break;
                }
            }
        }

        if (changed)
        {
            PBRLightStack.length = 0;
            for (let i = 0; i < cgl.tempData.lightStack.length; i++)
                PBRLightStack[i] = cgl.tempData.lightStack[i];

            buildShader();

            currentLightCount = cgl.tempData.lightStack.length;
        }
    }
}

function doRender()
{
    if (!PBRShader)buildShader();
    cgl.pushShader(PBRShader);
    let useDefaultLight = false;

    PBRShader.popTextures();

    let numLights = 0;
    if (cgl.tempData.lightStack)numLights = cgl.tempData.lightStack.length;

    if ((!cgl.tempData.pbrEnvStack || cgl.tempData.pbrEnvStack.length == 0) && !inLightmap.isLinked() && numLights == 0)
    {
        useDefaultLight = true;
        op.setUiError("deflight", "Default light is enabled. Please add lights or PBREnvironmentLights to your patch to make this warning disappear.", 1);
    }
    else op.setUiError("deflight", null);

    if (cgl.tempData.pbrEnvStack && cgl.tempData.pbrEnvStack.length > 0 &&
        cgl.tempData.pbrEnvStack[cgl.tempData.pbrEnvStack.length - 1].texIBLLUT.tex && cgl.tempData.pbrEnvStack[cgl.tempData.pbrEnvStack.length - 1].texDiffIrr.tex && cgl.tempData.pbrEnvStack[cgl.tempData.pbrEnvStack.length - 1].texPreFiltered.tex)
    {
        const pbrEnv = cgl.tempData.pbrEnvStack[cgl.tempData.pbrEnvStack.length - 1];

        inIntensity.setValue(pbrEnv.intensity);

        PBRShader.pushTexture(inIBLLUTUniform, pbrEnv.texIBLLUT.tex);
        PBRShader.pushTexture(inIrradianceUniform, pbrEnv.texDiffIrr.tex, cgl.gl.TEXTURE_CUBE_MAP);
        PBRShader.pushTexture(inPrefilteredUniform, pbrEnv.texPreFiltered.tex, cgl.gl.TEXTURE_CUBE_MAP);
        inMipLevelsUniform.setValue(pbrEnv.texPreFilteredMipLevels || 7);

        PBRShader.toggleDefine("USE_PARALLAX_CORRECTION", pbrEnv.UseParallaxCorrection);
        if (pbrEnv.UseParallaxCorrection)
        {
            inPCOrigin.setValue(pbrEnv.PCOrigin);
            inPCboxMin.setValue(pbrEnv.PCboxMin);
            inPCboxMax.setValue(pbrEnv.PCboxMax);
        }

        setEnvironmentLighting(true);
    }
    else
    {
        setEnvironmentLighting(false);
    }

    if (useDefaultLight)
    {
        const iViewMatrix = mat4.create();
        mat4.invert(iViewMatrix, cgl.vMatrix);

        defaultLightStack[0].position = [iViewMatrix[12], iViewMatrix[13], iViewMatrix[14]];
        cgl.tempData.lightStack = defaultLightStack;
    }

    if (inTexIBLLUT.get())
    {
        setEnvironmentLighting(true);
        PBRShader.pushTexture(inIBLLUTUniform, inTexIBLLUT.get().tex);
        inMipLevelsUniform.setValue(inMipLevels.get());
        if (inTexIrradiance.get()) PBRShader.pushTexture(inIrradianceUniform, inTexIrradiance.get().cubemap, cgl.gl.TEXTURE_CUBE_MAP);
        if (inTexPrefiltered.get()) PBRShader.pushTexture(inPrefilteredUniform, inTexPrefiltered.get().cubemap, cgl.gl.TEXTURE_CUBE_MAP);
    }

    if (inTexAlbedo.get()) PBRShader.pushTexture(inAlbedoUniform, inTexAlbedo.get().tex);
    if (inTexAORM.get()) PBRShader.pushTexture(inAORMUniform, inTexAORM.get().tex);
    if (inTexNormal.get()) PBRShader.pushTexture(inNormalUniform, inTexNormal.get().tex);
    if (inTexEmission.get()) PBRShader.pushTexture(inEmissionUniform, inTexEmission.get().tex);
    if (inTexHeight.get()) PBRShader.pushTexture(inHeightUniform, inTexHeight.get().tex);
    if (inLightmap.get()) PBRShader.pushTexture(inLightmapUniform, inLightmap.get().tex);
    if (inTexClearCoatNormal.get()) PBRShader.pushTexture(inCCNormalUniform, inTexClearCoatNormal.get().tex);
    if (inTexThinFilm.get()) PBRShader.pushTexture(inTexThinFilmUniform, inTexThinFilm.get().tex);

    updateLights();
    updateLightUniforms();

    outTrigger.trigger();
    cgl.popShader();

    if (useDefaultLight) cgl.tempData.lightStack = [];
}

}
};

CABLES.OPS["a5234947-f65a-41e2-a691-b81382903a71"]={f:Ops.Gl.Pbr.PbrMaterial,objName:"Ops.Gl.Pbr.PbrMaterial"};




// **************************************************************
// 
// Ops.Gl.Matrix.OrbitControls_v3
// 
// **************************************************************

Ops.Gl.Matrix.OrbitControls_v3= class extends CABLES.Op 
{
constructor()
{
super(...arguments);
const op=this;
const attachments=op.attachments={};
const
    render = op.inTrigger("render"),
    minDist = op.inValueFloat("min distance", 1),
    maxDist = op.inValueFloat("max distance", 999999),

    minRotY = op.inValue("min rot y", 0),
    maxRotY = op.inValue("max rot y", 0),

    initialRadius = op.inValue("initial radius", 2),
    initialAxis = op.inValueSlider("initial axis y", 0.5),
    initialX = op.inValueSlider("initial axis x", 0.25),

    smoothness = op.inValueSlider("Smoothness", 1.0),
    speedX = op.inValue("Speed X", 1),
    speedY = op.inValue("Speed Y", 1),

    active = op.inValueBool("Active", true),

    allowPanning = op.inValueBool("Allow Panning", true),
    allowZooming = op.inValueBool("Allow Zooming", true),
    allowRotation = op.inValueBool("Allow Rotation", true),
    restricted = op.inValueBool("restricted", true),
    inIdentity = op.inBool("Identity", true),
    inReset = op.inTriggerButton("Reset"),

    trigger = op.outTrigger("trigger"),
    outRadius = op.outNumber("radius"),
    outXDeg = op.outNumber("Rot X"),
    outYDeg = op.outNumber("Rot Y");
    // outCoords = op.outArray("Eye/Target Pos");

op.setPortGroup("Initial Values", [initialAxis, initialX, initialRadius]);
op.setPortGroup("Interaction", [smoothness, speedX, speedY]);
op.setPortGroup("Boundaries", [minRotY, maxRotY, minDist, maxDist]);

const halfCircle = Math.PI;
const fullCircle = Math.PI * 2;

const
    vUp = vec3.create(),
    vCenter = vec3.create(),
    viewMatrix = mat4.create(),
    tempViewMatrix = mat4.create(),
    vOffset = vec3.create(),
    finalEyeAbs = vec3.create(),
    tempEye = vec3.create(),
    finalEye = vec3.create(),
    tempCenter = vec3.create(),
    finalCenter = vec3.create();

let eye = vec3.create(),
    mouseDown = false,
    radius = 5,
    lastMouseX = 0, lastMouseY = 0,
    percX = 0, percY = 0,
    px = 0,
    py = 0,
    divisor = 1,
    element = null,
    initializing = true,
    eyeTargetCoord = [0, 0, 0, 0, 0, 0],
    lastPy = 0;

op.onDelete = unbind;
smoothness.onChange = updateSmoothness;
initialRadius.onChange =
    inReset.onTriggered = reset;

eye = circlePos(0);
vec3.set(vCenter, 0, 0, 0);
vec3.set(vUp, 0, 1, 0);
updateSmoothness();
reset();

function reset()
{
    let off = 0;

    if (px % fullCircle < -halfCircle)
    {
        off = -fullCircle;
        px %= -fullCircle;
    }
    else
    if (px % fullCircle > halfCircle)
    {
        off = fullCircle;
        px %= fullCircle;
    }
    else px %= fullCircle;

    py %= (Math.PI);

    vec3.set(vOffset, 0, 0, 0);
    vec3.set(vCenter, 0, 0, 0);
    vec3.set(vUp, 0, 1, 0);

    percX = (initialX.get() * Math.PI * 2 + off);
    percY = (initialAxis.get() - 0.5);

    radius = initialRadius.get();
    eye = circlePos(percY);
}

function updateSmoothness()
{
    divisor = smoothness.get() * 10 + 1;
}

function ip(val, goal)
{
    if (initializing) return goal;
    return val + (goal - val) / divisor;
}

render.onTriggered = function ()
{
    const cgl = op.patch.cg;
    if (!cgl) return;

    if (!element)
    {
        setElement(cgl.canvas);
        bind();
    }

    cgl.pushViewMatrix();

    px = ip(px, percX);
    py = ip(py, percY);

    let degY = (py + 0.5) * 180;

    if (minRotY.get() !== 0 && degY < minRotY.get())
    {
        degY = minRotY.get();
        py = lastPy;
    }
    else if (maxRotY.get() !== 0 && degY > maxRotY.get())
    {
        degY = maxRotY.get();
        py = lastPy;
    }
    else
    {
        lastPy = py;
    }

    const degX = (px) * CGL.RAD2DEG;

    outYDeg.set(degY);
    outXDeg.set(degX);

    circlePosi(eye, py);

    vec3.add(tempEye, eye, vOffset);
    vec3.add(tempCenter, vCenter, vOffset);

    finalEye[0] = ip(finalEye[0], tempEye[0]);
    finalEye[1] = ip(finalEye[1], tempEye[1]);
    finalEye[2] = ip(finalEye[2], tempEye[2]);

    finalCenter[0] = ip(finalCenter[0], tempCenter[0]);
    finalCenter[1] = ip(finalCenter[1], tempCenter[1]);
    finalCenter[2] = ip(finalCenter[2], tempCenter[2]);

    // eyeTargetCoord[0] = finalEye[0];
    // eyeTargetCoord[1] = finalEye[1];
    // eyeTargetCoord[2] = finalEye[2];
    // eyeTargetCoord[3] = finalCenter[0];
    // eyeTargetCoord[4] = finalCenter[1];
    // eyeTargetCoord[5] = finalCenter[2];
    // outCoords.setRef(eyeTargetCoord);

    const empty = vec3.create();

    if (inIdentity.get()) mat4.identity(cgl.vMatrix);

    mat4.lookAt(viewMatrix, finalEye, finalCenter, vUp);
    mat4.rotate(viewMatrix, viewMatrix, px, vUp);

    // finaly multiply current scene viewmatrix
    mat4.multiply(cgl.vMatrix, cgl.vMatrix, viewMatrix);

    trigger.trigger();
    cgl.popViewMatrix();
    initializing = false;
};

function circlePosi(vec, perc)
{
    if (radius < minDist.get()) radius = minDist.get();
    if (radius > maxDist.get()) radius = maxDist.get();

    outRadius.set(radius);

    let i = 0, degInRad = 0;

    degInRad = 360 * perc / 2 * CGL.DEG2RAD;
    vec3.set(vec,
        Math.cos(degInRad) * radius,
        Math.sin(degInRad) * radius,
        0);
    return vec;
}

function circlePos(perc)
{
    if (radius < minDist.get())radius = minDist.get();
    if (radius > maxDist.get())radius = maxDist.get();

    outRadius.set(radius);

    let i = 0, degInRad = 0;
    const vec = vec3.create();
    degInRad = 360 * perc / 2 * CGL.DEG2RAD;
    vec3.set(vec,
        Math.cos(degInRad) * radius,
        Math.sin(degInRad) * radius,
        0);
    return vec;
}

function onmousemove(event)
{
    if (!mouseDown) return;

    const x = event.clientX;
    const y = event.clientY;

    let movementX = (x - lastMouseX);
    let movementY = (y - lastMouseY);

    movementX *= speedX.get();
    movementY *= speedY.get();

    if (event.buttons == 2 && allowPanning.get())
    {
        vOffset[2] += movementX * 0.01;
        vOffset[1] += movementY * 0.01;
    }
    else
    if (event.buttons == 4 && allowZooming.get())
    {
        radius += movementY * 0.05;
        eye = circlePos(percY);
    }
    else
    {
        if (allowRotation.get())
        {
            percX += movementX * 0.003;
            percY += movementY * 0.002;

            if (restricted.get())
            {
                if (percY > 0.5)percY = 0.5;
                if (percY < -0.5)percY = -0.5;
            }
        }
    }

    lastMouseX = x;
    lastMouseY = y;
}

function onMouseDown(event)
{
    lastMouseX = event.clientX;
    lastMouseY = event.clientY;
    mouseDown = true;

    try { element.setPointerCapture(event.pointerId); }
    catch (e) {}
}

function onMouseUp(e)
{
    mouseDown = false;

    try { element.releasePointerCapture(e.pointerId); }
    catch (e) {}
}

function lockChange()
{
    const el = op.patch.cg.canvas;

    if (document.pointerLockElement === el || document.mozPointerLockElement === el || document.webkitPointerLockElement === el)
        document.addEventListener("mousemove", onmousemove, false);
}

function onMouseEnter(e)
{
}

initialX.onChange = function ()
{
    px = percX = (initialX.get() * Math.PI * 2);
};

initialAxis.onChange = function ()
{
    py = percY = (initialAxis.get() - 0.5);
    eye = circlePos(percY);
};

const onMouseWheel = function (event)
{
    if (allowZooming.get())
    {
        const delta = CGL.getWheelSpeed(event) * 0.06;
        radius += (parseFloat(delta)) * 1.2;
        eye = circlePos(percY);
    }
};

const ontouchstart = function (event)
{
    if (event.touches && event.touches.length > 0) onMouseDown(event.touches[0]);
};

const ontouchend = function (event)
{
    onMouseUp();
};

const ontouchmove = function (event)
{
    if (event.touches && event.touches.length > 0) onmousemove(event.touches[0]);
};

active.onChange = function ()
{
    if (active.get())bind();
    else unbind();
};

function setElement(ele)
{
    unbind();
    element = ele;
    bind();
}

function bind()
{
    if (!element) return;
    if (!active.get()) return unbind();

    element.addEventListener("pointermove", onmousemove);
    element.addEventListener("pointerdown", onMouseDown);
    element.addEventListener("pointerup", onMouseUp);
    element.addEventListener("pointerleave", onMouseUp);
    element.addEventListener("pointerenter", onMouseEnter);
    element.addEventListener("contextmenu", function (e) { e.preventDefault(); });
    element.addEventListener("wheel", onMouseWheel, { "passive": true });
}

function unbind()
{
    if (!element) return;

    element.removeEventListener("pointermove", onmousemove);
    element.removeEventListener("pointerdown", onMouseDown);
    element.removeEventListener("pointerup", onMouseUp);
    element.removeEventListener("pointerleave", onMouseUp);
    element.removeEventListener("pointerenter", onMouseUp);
    element.removeEventListener("wheel", onMouseWheel);
}

}
};

CABLES.OPS["0655b098-d2a8-4ce2-a0b9-ecb2c78f873a"]={f:Ops.Gl.Matrix.OrbitControls_v3,objName:"Ops.Gl.Matrix.OrbitControls_v3"};




// **************************************************************
// 
// Ops.Gl.Meshes.Cube_v2
// 
// **************************************************************

Ops.Gl.Meshes.Cube_v2= class extends CABLES.Op 
{
constructor()
{
super(...arguments);
const op=this;
const attachments=op.attachments={};
const
    render = op.inTrigger("Render"),
    active = op.inValueBool("Render Mesh", true),
    width = op.inValue("Width", 1),
    len = op.inValue("Length", 1),
    height = op.inValue("Height", 1),
    center = op.inValueBool("Center", true),
    mapping = op.inSwitch("Mapping", ["Side", "Cube +-", "SideWrap"], "Side"),
    mappingBias = op.inValue("Bias", 0),
    inFlipX = op.inValueBool("Flip X", true),
    sideTop = op.inValueBool("Top", true),
    sideBottom = op.inValueBool("Bottom", true),
    sideLeft = op.inValueBool("Left", true),
    sideRight = op.inValueBool("Right", true),
    sideFront = op.inValueBool("Front", true),
    sideBack = op.inValueBool("Back", true),
    trigger = op.outTrigger("Next"),
    geomOut = op.outObject("geometry", null, "geometry");

const cgl = op.patch.cgl;
op.toWorkPortsNeedToBeLinked(render);
op.toWorkShouldNotBeChild("Ops.Gl.TextureEffects.ImageCompose", CABLES.OP_PORT_TYPE_FUNCTION);

op.setPortGroup("Mapping", [mapping, mappingBias, inFlipX]);
op.setPortGroup("Geometry", [width, height, len, center]);
op.setPortGroup("Sides", [sideTop, sideBottom, sideLeft, sideRight, sideFront, sideBack]);

let geom = null,
    mesh = null,
    meshvalid = true,
    needsRebuild = true;

mappingBias.onChange =
    inFlipX.onChange =
    sideTop.onChange =
    sideBottom.onChange =
    sideLeft.onChange =
    sideRight.onChange =
    sideFront.onChange =
    sideBack.onChange =
    mapping.onChange =
    width.onChange =
    height.onChange =
    len.onChange =
    center.onChange = buildMeshLater;

function buildMeshLater()
{
    needsRebuild = true;
}

render.onLinkChanged = function ()
{
    if (!render.isLinked()) geomOut.set(null);
    else geomOut.setRef(geom);
};

render.onTriggered = function ()
{
    if (needsRebuild)buildMesh();
    if (active.get() && mesh && meshvalid) mesh.render();
    trigger.trigger();
};

op.preRender = function ()
{
    buildMesh();
    if (mesh && cgl)mesh.render();
};

function buildMesh()
{
    if (!geom)geom = new CGL.Geometry("cubemesh");
    geom.clear();

    let x = width.get();
    let nx = -1 * width.get();
    let y = height.get();
    let ny = -1 * height.get();
    let z = len.get();
    let nz = -1 * len.get();

    if (!center.get())
    {
        nx = 0;
        ny = 0;
        nz = 0;
    }
    else
    {
        x *= 0.5;
        nx *= 0.5;
        y *= 0.5;
        ny *= 0.5;
        z *= 0.5;
        nz *= 0.5;
    }

    addAttribs(geom, x, y, z, nx, ny, nz);
    if (mapping.get() == "Side") sideMappedCube(geom, 1, 1, 1);
    else if (mapping.get() == "SideWrap") sideMappedCube(geom, x, y, z);
    else cubeMappedCube(geom);

    geom.verticesIndices = [];
    if (sideTop.get()) geom.verticesIndices.push(8, 9, 10, 8, 10, 11); // Top face
    if (sideBottom.get()) geom.verticesIndices.push(12, 13, 14, 12, 14, 15); // Bottom face
    if (sideLeft.get()) geom.verticesIndices.push(20, 21, 22, 20, 22, 23); // Left face
    if (sideRight.get()) geom.verticesIndices.push(16, 17, 18, 16, 18, 19); // Right face
    if (sideBack.get()) geom.verticesIndices.push(4, 5, 6, 4, 6, 7); // Back face
    if (sideFront.get()) geom.verticesIndices.push(0, 1, 2, 0, 2, 3); // Front face

    if (geom.verticesIndices.length === 0) meshvalid = false;
    else meshvalid = true;

    if (mesh)mesh.dispose();
    if (op.patch.cg) mesh = op.patch.cg.createMesh(geom, { "opId": op.id });

    geomOut.setRef(geom);

    needsRebuild = false;
}

op.onDelete = function ()
{
    if (mesh)mesh.dispose();
};

function sideMappedCube(geom, x, y, z)
{
    const bias = mappingBias.get();

    let u1 = 1.0 - bias;
    let u0 = 0.0 + bias;
    if (inFlipX.get())
    {
        [u1, u0] = [u0, u1];
    }

    let v1 = 1.0 - bias;
    let v0 = 0.0 + bias;

    geom.setTexCoords([
        // Front face
        x * u0, y * v1,
        x * u1, y * v1,
        x * u1, y * v0,
        x * u0, y * v0,
        // Back face
        x * u1, y * v1,
        x * u1, y * v0,
        x * u0, y * v0,
        x * u0, y * v1,
        // Top face
        x * u0, z * v0,
        x * u0, z * v1,
        x * u1, z * v1,
        x * u1, z * v0,
        // Bottom face
        x * u1, y * v0,
        x * u0, y * v0,
        x * u0, y * v1,
        x * u1, y * v1,
        // Right face
        z * u1, y * v1,
        z * u1, y * v0,
        z * u0, y * v0,
        z * u0, y * v1,
        // Left face
        z * u0, y * v1,
        z * u1, y * v1,
        z * u1, y * v0,
        z * u0, y * v0,
    ]);
}

function cubeMappedCube(geom, x, y, z, nx, ny, nz)
{
    const sx = 0.25;
    const sy = 1 / 3;
    const bias = mappingBias.get();

    let flipx = 0.0;
    if (inFlipX.get()) flipx = 1.0;

    const tc = [];
    tc.push(
        // Front face   Z+
        flipx + sx + bias, sy * 2 - bias, flipx + sx * 2 - bias, sy * 2 - bias, flipx + sx * 2 - bias, sy + bias, flipx + sx + bias, sy + bias,
        // Back face Z-
        flipx + sx * 4 - bias, sy * 2 - bias, flipx + sx * 4 - bias, sy + bias, flipx + sx * 3 + bias, sy + bias, flipx + sx * 3 + bias, sy * 2 - bias);

    if (inFlipX.get())
        tc.push(
            // Top face
            sx + bias, 0 - bias, sx * 2 - bias, 0 - bias, sx * 2 - bias, sy * 1 + bias, sx + bias, sy * 1 + bias,
            // Bottom face
            sx + bias, sy * 3 + bias, sx + bias, sy * 2 - bias, sx * 2 - bias, sy * 2 - bias, sx * 2 - bias, sy * 3 + bias
        );

    else
        tc.push(
            // Top face
            sx + bias, 0 + bias, sx + bias, sy * 1 - bias, sx * 2 - bias, sy * 1 - bias, sx * 2 - bias, 0 + bias,
            // Bottom face
            sx + bias, sy * 3 - bias, sx * 2 - bias, sy * 3 - bias, sx * 2 - bias, sy * 2 + bias, sx + bias, sy * 2 + bias);

    tc.push(
        // Right face
        flipx + sx * 3 - bias, 1.0 - sy - bias, flipx + sx * 3 - bias, 1.0 - sy * 2 + bias, flipx + sx * 2 + bias, 1.0 - sy * 2 + bias, flipx + sx * 2 + bias, 1.0 - sy - bias,
        // Left face
        flipx + sx * 0 + bias, 1.0 - sy - bias, flipx + sx * 1 - bias, 1.0 - sy - bias, flipx + sx * 1 - bias, 1.0 - sy * 2 + bias, flipx + sx * 0 + bias, 1.0 - sy * 2 + bias);

    geom.setTexCoords(tc);
}

function addAttribs(geom, x, y, z, nx, ny, nz)
{
    geom.vertices = [
        // Front face
        nx, ny, z,
        x, ny, z,
        x, y, z,
        nx, y, z,
        // Back face
        nx, ny, nz,
        nx, y, nz,
        x, y, nz,
        x, ny, nz,
        // Top face
        nx, y, nz,
        nx, y, z,
        x, y, z,
        x, y, nz,
        // Bottom face
        nx, ny, nz,
        x, ny, nz,
        x, ny, z,
        nx, ny, z,
        // Right face
        x, ny, nz,
        x, y, nz,
        x, y, z,
        x, ny, z,
        // zeft face
        nx, ny, nz,
        nx, ny, z,
        nx, y, z,
        nx, y, nz
    ];

    geom.vertexNormals = new Float32Array([
        // Front face
        0.0, 0.0, 1.0,
        0.0, 0.0, 1.0,
        0.0, 0.0, 1.0,
        0.0, 0.0, 1.0,

        // Back face
        0.0, 0.0, -1.0,
        0.0, 0.0, -1.0,
        0.0, 0.0, -1.0,
        0.0, 0.0, -1.0,

        // Top face
        0.0, 1.0, 0.0,
        0.0, 1.0, 0.0,
        0.0, 1.0, 0.0,
        0.0, 1.0, 0.0,

        // Bottom face
        0.0, -1.0, 0.0,
        0.0, -1.0, 0.0,
        0.0, -1.0, 0.0,
        0.0, -1.0, 0.0,

        // Right face
        1.0, 0.0, 0.0,
        1.0, 0.0, 0.0,
        1.0, 0.0, 0.0,
        1.0, 0.0, 0.0,

        // Left face
        -1.0, 0.0, 0.0,
        -1.0, 0.0, 0.0,
        -1.0, 0.0, 0.0,
        -1.0, 0.0, 0.0
    ]);
    geom.tangents = new Float32Array([
        // front face
        0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,
        // back face
        1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0,
        // top face
        -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0,
        // bottom face
        1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0,
        // right face
        0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1,
        // left face
        0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1
    ]);
    geom.biTangents = new Float32Array([
        // front face
        -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0,
        // back face
        1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0,
        // top face
        0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,
        // bottom face
        0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1,
        // right face
        0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,
        // left face
        0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1
    ]);
}

}
};

CABLES.OPS["37b92ba4-cea5-42ae-bf28-a513ca28549c"]={f:Ops.Gl.Meshes.Cube_v2,objName:"Ops.Gl.Meshes.Cube_v2"};




// **************************************************************
// 
// Ops.Gl.Matrix.WASDCamera_v2
// 
// **************************************************************

Ops.Gl.Matrix.WASDCamera_v2= class extends CABLES.Op 
{
constructor()
{
super(...arguments);
const op=this;
const attachments=op.attachments={};
const
    render = op.inTrigger("render"),
    enablePointerLock = op.inBool("Enable pointer lock", true),
    trigger = op.outTrigger("trigger"),
    isLocked = op.outBoolNum("isLocked", false),

    moveSpeed = op.inFloat("Speed", 1),
    mouseSpeed = op.inFloat("Mouse Speed", 1),
    fly = op.inValueBool("Allow Flying", true),
    inActive = op.inBool("Active", true),

    inMoveXPos = op.inBool("Move X+"),
    inMoveXNeg = op.inBool("Move X-"),
    inMoveYPos = op.inBool("Move Y+"),
    inMoveYNeg = op.inBool("Move Y-"),

    inReset = op.inTriggerButton("Reset"),

    outPosX = op.outNumber("posX"),
    outPosY = op.outNumber("posY"),
    outPosZ = op.outNumber("posZ"),

    outMouseDown = op.outTrigger("Mouse Left"),
    outMouseDownRight = op.outTrigger("Mouse Right"),

    outDirX = op.outNumber("Dir X"),
    outDirY = op.outNumber("Dir Y"),
    outDirZ = op.outNumber("Dir Z");

const vPos = vec3.create();
let speedx = 0, speedy = 0, speedz = 0;
const movementSpeedFactor = 0.5;

op.setPortGroup("Move", [inMoveYNeg, inMoveYPos, inMoveXNeg, inMoveXPos]);

let mouseNoPL = { "firstMove": true,
    "deltaX": 0,
    "deltaY": 0,
};

const DEG2RAD = 3.14159 / 180.0;

let rotX = 0;
let rotY = 0;

let posX = 0;
let posY = 0;
let posZ = 0;

let pressedW = false;
let pressedA = false;
let pressedS = false;
let pressedD = false;

const cgl = op.patch.cgl;

const viewMatrix = mat4.create();

op.toWorkPortsNeedToBeLinked(render);
let lastMove = 0;

initListener();

enablePointerLock.onChange = initListener;

inReset.onTriggered = () =>
{
    rotX = 0;
    rotY = 0;
    posX = 0;
    posY = 0;
    posZ = 0;
};

inActive.onChange = () =>
{
    document.exitPointerLock();
    removeListener();

    lockChangeCallback();

    if (inActive.get())
    {
        initListener();
    }
};

render.onTriggered = function ()
{
    if (cgl.tempData.shadowPass) return trigger.trigger();

    calcCameraMovement();
    move();

    if (!fly.get())posY = 0.0;

    if (speedx !== 0.0 || speedy !== 0.0 || speedz !== 0)
    {
        outPosX.set(posX);
        outPosY.set(posY);
        outPosZ.set(posZ);
    }

    cgl.pushViewMatrix();

    vec3.set(vPos, -posX, -posY, -posZ);

    mat4.identity(cgl.vMatrix);

    mat4.rotateX(cgl.vMatrix, cgl.vMatrix, DEG2RAD * rotX);
    mat4.rotateY(cgl.vMatrix, cgl.vMatrix, DEG2RAD * rotY);

    mat4.translate(cgl.vMatrix, cgl.vMatrix, vPos);

    trigger.trigger();
    cgl.popViewMatrix();

    // for dir vec
    mat4.identity(viewMatrix);
    mat4.rotateX(viewMatrix, viewMatrix, DEG2RAD * rotX);
    mat4.rotateY(viewMatrix, viewMatrix, DEG2RAD * rotY);
    mat4.transpose(viewMatrix, viewMatrix);

    const dir = vec4.create();
    vec4.transformMat4(dir, [0, 0, 1, 1], viewMatrix);

    vec4.normalize(dir, dir);
    outDirX.set(-dir[0]);
    outDirY.set(-dir[1]);
    outDirZ.set(-dir[2]);
};

//--------------

function calcCameraMovement()
{
    let camMovementXComponent = 0.0,
        camMovementYComponent = 0.0,
        camMovementZComponent = 0.0,
        pitchFactor = 0,
        yawFactor = 0;

    if (pressedW)
    {
        // Control X-Axis movement
        pitchFactor = Math.cos(DEG2RAD * rotX);

        camMovementXComponent += (movementSpeedFactor * (Math.sin(DEG2RAD * rotY))) * pitchFactor;

        // Control Y-Axis movement
        camMovementYComponent += movementSpeedFactor * (Math.sin(DEG2RAD * rotX)) * -1.0;

        // Control Z-Axis movement
        yawFactor = (Math.cos(DEG2RAD * rotX));
        camMovementZComponent += (movementSpeedFactor * (Math.cos(DEG2RAD * rotY)) * -1.0) * yawFactor;
    }

    if (pressedS)
    {
        // Control X-Axis movement
        pitchFactor = Math.cos(DEG2RAD * rotX);
        camMovementXComponent += (movementSpeedFactor * (Math.sin(DEG2RAD * rotY)) * -1.0) * pitchFactor;

        // Control Y-Axis movement
        camMovementYComponent += movementSpeedFactor * (Math.sin(DEG2RAD * rotX));

        // Control Z-Axis movement
        yawFactor = (Math.cos(DEG2RAD * rotX));
        camMovementZComponent += (movementSpeedFactor * (Math.cos(DEG2RAD * rotY))) * yawFactor;
    }

    let yRotRad = DEG2RAD * rotY;

    if (pressedA)
    {
        // Calculate our Y-Axis rotation in radians once here because we use it twice

        camMovementXComponent += -movementSpeedFactor * (Math.cos(yRotRad));
        camMovementZComponent += -movementSpeedFactor * (Math.sin(yRotRad));
    }

    if (pressedD)
    {
        // Calculate our Y-Axis rotation in radians once here because we use it twice

        camMovementXComponent += movementSpeedFactor * (Math.cos(yRotRad));
        camMovementZComponent += movementSpeedFactor * (Math.sin(yRotRad));
    }

    const mulSpeed = 0.016;

    speedx = camMovementXComponent * mulSpeed;
    speedy = camMovementYComponent * mulSpeed;
    speedz = camMovementZComponent * mulSpeed;

    if (speedx > movementSpeedFactor) speedx = movementSpeedFactor;
    if (speedx < -movementSpeedFactor) speedx = -movementSpeedFactor;

    if (speedy > movementSpeedFactor) speedy = movementSpeedFactor;
    if (speedy < -movementSpeedFactor) speedy = -movementSpeedFactor;

    if (speedz > movementSpeedFactor) speedz = movementSpeedFactor;
    if (speedz < -movementSpeedFactor) speedz = -movementSpeedFactor;
}

function moveCallback(e)
{
    const mouseSensitivity = 0.1;
    rotX += e.movementY * mouseSensitivity * mouseSpeed.get();
    rotY += e.movementX * mouseSensitivity * mouseSpeed.get();

    if (rotX < -90.0) rotX = -90.0;
    if (rotX > 90.0) rotX = 90.0;
    if (rotY < -180.0) rotY += 360.0;
    if (rotY > 180.0) rotY -= 360.0;
}

const canvas = op.patch.cgl.canvas;

function mouseDown(e)
{
    if (e.which == 3) outMouseDownRight.trigger();
    else outMouseDown.trigger();
}

function lockChangeCallback(e)
{
    if (document.pointerLockElement === canvas ||
            document.mozPointerLockElement === canvas ||
            document.webkitPointerLockElement === canvas)
    {
        document.addEventListener("pointerdown", mouseDown, false);
        document.addEventListener("pointermove", moveCallback, false);
        document.addEventListener("keydown", keyDown, false);
        document.addEventListener("keyup", keyUp, false);
        isLocked.set(true);
    }
    else
    {
        document.removeEventListener("pointerdown", mouseDown, false);
        document.removeEventListener("pointermove", moveCallback, false);
        document.removeEventListener("keydown", keyDown, false);
        document.removeEventListener("keyup", keyUp, false);
        isLocked.set(false);
        pressedW = false;
        pressedA = false;
        pressedS = false;
        pressedD = false;
    }
}

function startPointerLock()
{
    const test = false;
    if (render.isLinked() && enablePointerLock.get())
    {
        document.addEventListener("pointermove", moveCallback, false);
        canvas.requestPointerLock = canvas.requestPointerLock ||
                                    canvas.mozRequestPointerLock ||
                                    canvas.webkitRequestPointerLock;
        canvas.requestPointerLock();
    }
}

function removeListener()
{
    cgl.canvas.removeEventListener("pointermove", moveCallbackNoPL, false);
    cgl.canvas.removeEventListener("pointerup", upCallbackNoPL, false);
    cgl.canvas.removeEventListener("keydown", keyDown, false);
    cgl.canvas.removeEventListener("keyup", keyUp, false);

    document.removeEventListener("pointerlockchange", lockChangeCallback, false);
    document.removeEventListener("mozpointerlockchange", lockChangeCallback, false);
    document.removeEventListener("webkitpointerlockchange", lockChangeCallback, false);
    op.patch.cgl.canvas.removeEventListener("mousedown", startPointerLock);
}

function initListener()
{
    if (enablePointerLock.get())
    {
        document.addEventListener("pointerlockchange", lockChangeCallback, false);
        document.addEventListener("mozpointerlockchange", lockChangeCallback, false);
        document.addEventListener("webkitpointerlockchange", lockChangeCallback, false);
        op.patch.cgl.canvas.addEventListener("mousedown", startPointerLock);

        cgl.canvas.removeEventListener("pointermove", moveCallbackNoPL, false);
        cgl.canvas.removeEventListener("pointerup", upCallbackNoPL, false);
        cgl.canvas.removeEventListener("keydown", keyDown, false);
        cgl.canvas.removeEventListener("keyup", keyUp, false);
    }
    else
    {
        cgl.canvas.addEventListener("pointermove", moveCallbackNoPL, false);
        cgl.canvas.addEventListener("pointerup", upCallbackNoPL, false);
        cgl.canvas.addEventListener("keydown", keyDown, false);
        cgl.canvas.addEventListener("keyup", keyUp, false);
    }
}

function upCallbackNoPL(e)
{
    try { cgl.canvas.releasePointerCapture(e.pointerId); }
    catch (e) {}
    mouseNoPL.firstMove = true;
}

function moveCallbackNoPL(e)
{
    if (e && e.buttons == 1)
    {
        try { cgl.canvas.setPointerCapture(e.pointerId); }
        catch (_e) {}

        if (!mouseNoPL.firstMove)
        {
            // outDragging.set(true);
            const deltaX = (e.clientX - mouseNoPL.lastX) * mouseSpeed.get() * 0.5;
            const deltaY = (e.clientY - mouseNoPL.lastY) * mouseSpeed.get() * 0.5;

            rotX += deltaY;
            rotY += deltaX;
            // outDeltaX.set(deltaX);
            // outDeltaY.set(deltaY);
        }

        mouseNoPL.firstMove = false;

        mouseNoPL.lastX = e.clientX;
        mouseNoPL.lastY = e.clientY;
    }
}

function move()
{
    let timeOffset = window.performance.now() - lastMove;
    timeOffset *= moveSpeed.get();
    posX += speedx * timeOffset;
    posY += speedy * timeOffset;
    posZ += speedz * timeOffset;

    lastMove = window.performance.now();
}

function keyDown(e)
{
    switch (e.which)
    {
    case 87:
        pressedW = true;
        break;
    case 65:
        pressedA = true;
        break;
    case 83:
        pressedS = true;
        break;
    case 68:
        pressedD = true;
        break;

    default:
        break;
    }
}

function keyUp(e)
{
    switch (e.which)
    {
    case 87:
        pressedW = false;
        break;
    case 65:
        pressedA = false;
        break;
    case 83:
        pressedS = false;
        break;
    case 68:
        pressedD = false;
        break;
    }
}

inMoveXPos.onChange = () => { pressedD = inMoveXPos.get(); };
inMoveXNeg.onChange = () => { pressedA = inMoveXNeg.get(); };
inMoveYPos.onChange = () => { pressedW = inMoveYPos.get(); };
inMoveYNeg.onChange = () => { pressedS = inMoveYNeg.get(); };

}
};

CABLES.OPS["af6c3fe2-58a9-4f81-be41-4c21aabffde9"]={f:Ops.Gl.Matrix.WASDCamera_v2,objName:"Ops.Gl.Matrix.WASDCamera_v2"};




// **************************************************************
// 
// Ops.Gl.Matrix.Camera_v2
// 
// **************************************************************

Ops.Gl.Matrix.Camera_v2= class extends CABLES.Op 
{
constructor()
{
super(...arguments);
const op=this;
const attachments=op.attachments={};
const render = op.inTrigger("render");
const trigger = op.outTrigger("trigger");
const inIdentity = op.inBool("Identity", true);
/* Inputs */
// projection | prespective & ortogonal
const projectionMode = op.inValueSelect("projection mode", ["prespective", "ortogonal"], "prespective");
const zNear = op.inValue("frustum near", 0.01);
const zFar = op.inValue("frustum far", 5000.0);

const fov = op.inValue("fov", 45);
const autoAspect = op.inValueBool("Auto Aspect Ratio", true);
const aspect = op.inValue("Aspect Ratio", 1);

// look at camera
const eyeX = op.inValue("eye X", 0);
const eyeY = op.inValue("eye Y", 0);
const eyeZ = op.inValue("eye Z", 5);

const centerX = op.inValue("center X", 0);
const centerY = op.inValue("center Y", 0);
const centerZ = op.inValue("center Z", 0);

// camera transform and movements
const posX = op.inValue("truck", 0);
const posY = op.inValue("boom", 0);
const posZ = op.inValue("dolly", 0);

const rotX = op.inValue("tilt", 0);
const rotY = op.inValue("pan", 0);
const rotZ = op.inValue("roll", 0);

/* Outputs */
const outAsp = op.outNumber("Aspect");
const outArr = op.outArray("Look At Array");

/* logic */
const cgl = op.patch.cgl;

let asp = 0;

const vUp = vec3.create();
const vEye = vec3.create();
const vCenter = vec3.create();
const transMatrix = mat4.create();
mat4.identity(transMatrix);

const arr = [];

// Transform and move
const vPos = vec3.create();
const transMatrixMove = mat4.create();
mat4.identity(transMatrixMove);

let updateCameraMovementMatrix = true;

render.onTriggered = function ()
{
    if (cgl.tempData.shadowPass) return trigger.trigger();

    // Aspect ration
    if (!autoAspect.get()) asp = aspect.get();
    else asp = cgl.getViewPort()[2] / cgl.getViewPort()[3];
    outAsp.set(asp);

    // translation (truck, boom, dolly)
    cgl.pushViewMatrix();

    if (inIdentity.get())mat4.identity(cgl.vMatrix);

    if (updateCameraMovementMatrix)
    {
        mat4.identity(transMatrixMove);

        vec3.set(vPos, posX.get(), posY.get(), posZ.get());
        if (posX.get() !== 0.0 || posY.get() !== 0.0 || posZ.get() !== 0.0)
            mat4.translate(transMatrixMove, transMatrixMove, vPos);

        if (rotX.get() !== 0)
            mat4.rotateX(transMatrixMove, transMatrixMove, rotX.get() * CGL.DEG2RAD);
        if (rotY.get() !== 0)
            mat4.rotateY(transMatrixMove, transMatrixMove, rotY.get() * CGL.DEG2RAD);
        if (rotZ.get() !== 0)
            mat4.rotateZ(transMatrixMove, transMatrixMove, rotZ.get() * CGL.DEG2RAD);

        updateCameraMovementMatrix = false;
    }

    mat4.multiply(cgl.vMatrix, cgl.vMatrix, transMatrixMove);

    // projection (prespective / ortogonal)
    cgl.pushPMatrix();

    // look at
    cgl.pushViewMatrix();

    if (projectionMode.get() == "prespective")
    {
        mat4.perspective(
            cgl.pMatrix,
            fov.get() * 0.0174533,
            asp,
            zNear.get(),
            zFar.get()
        );
    }
    else if (projectionMode.get() == "ortogonal")
    {
        mat4.ortho(
            cgl.pMatrix,
            -1 * (fov.get() / 14),
            1 * (fov.get() / 14),
            -1 * (fov.get() / 14) / asp,
            1 * (fov.get() / 14) / asp,
            zNear.get(),
            zFar.get()
        );
    }

    arr[0] = eyeX.get();
    arr[1] = eyeY.get();
    arr[2] = eyeZ.get();

    arr[3] = centerX.get();
    arr[4] = centerY.get();
    arr[5] = centerZ.get();

    arr[6] = 0;
    arr[7] = 1;
    arr[8] = 0;

    outArr.setRef(arr);

    vec3.set(vUp, 0, 1, 0);
    vec3.set(vEye, eyeX.get(), eyeY.get(), eyeZ.get());
    vec3.set(vCenter, centerX.get(), centerY.get(), centerZ.get());

    mat4.lookAt(transMatrix, vEye, vCenter, vUp);

    mat4.multiply(cgl.vMatrix, cgl.vMatrix, transMatrix);

    trigger.trigger();

    cgl.popViewMatrix();
    cgl.popPMatrix();

    cgl.popViewMatrix();

    // GUI for dolly, boom and truck
    if (op.isCurrentUiOp())
        gui.setTransformGizmo({
            "posX": posX,
            "posY": posY,
            "posZ": posZ
        });
};

const updateUI = function ()
{
    if (!autoAspect.get())
    {
        aspect.setUiAttribs({ "greyout": false });
    }
    else
    {
        aspect.setUiAttribs({ "greyout": true });
    }
};

const cameraMovementChanged = function ()
{
    updateCameraMovementMatrix = true;
};

// listeners
posX.onChange = cameraMovementChanged;
posY.onChange = cameraMovementChanged;
posZ.onChange = cameraMovementChanged;

rotX.onChange = cameraMovementChanged;
rotY.onChange = cameraMovementChanged;
rotZ.onChange = cameraMovementChanged;

autoAspect.onChange = updateUI;
updateUI();

}
};

CABLES.OPS["f7673a93-7772-4ade-9d3d-df7174f5258b"]={f:Ops.Gl.Matrix.Camera_v2,objName:"Ops.Gl.Matrix.Camera_v2"};




// **************************************************************
// 
// Ops.Gl.Matrix.Scale
// 
// **************************************************************

Ops.Gl.Matrix.Scale= class extends CABLES.Op 
{
constructor()
{
super(...arguments);
const op=this;
const attachments=op.attachments={};
const
    render = op.inTrigger("render"),
    scale = op.inValueFloat("scale", 1.0),
    scaleX = op.inValueFloat("x", 1),
    scaleY = op.inValueFloat("y", 1),
    scaleZ = op.inValueFloat("z", 1),
    trigger = op.outTrigger("trigger");

op.setPortGroup("Axis", [scaleX, scaleY, scaleZ]);

const vScale = vec3.create();

scaleX.onChange =
    scaleY.onChange =
    scaleZ.onChange =
    scale.onChange = scaleChanged;

scaleChanged();

render.onTriggered = function ()
{
    const cgl = op.patch.cg || op.patch.cgl;
    cgl.pushModelMatrix();
    mat4.scale(cgl.mMatrix, cgl.mMatrix, vScale);
    trigger.trigger();
    cgl.popModelMatrix();
};

function scaleChanged()
{
    const s = scale.get();
    vec3.set(vScale, s * scaleX.get(), s * scaleY.get(), s * scaleZ.get());
}

}
};

CABLES.OPS["50e7f565-0cdb-47ca-912b-87c04e2f00e3"]={f:Ops.Gl.Matrix.Scale,objName:"Ops.Gl.Matrix.Scale"};




// **************************************************************
// 
// Ops.Gl.GLTF.GltfSetMaterial
// 
// **************************************************************

Ops.Gl.GLTF.GltfSetMaterial= class extends CABLES.Op 
{
constructor()
{
super(...arguments);
const op=this;
const attachments=op.attachments={};
const
    inShader = op.inObject("Shader", null, "shader"),
    inName = op.inString("Material Name", "none"),
    outMat = op.outObject("Material");

inName.onChange =
inShader.onChange = function ()
{
    op.setUiAttrib({ "extendTitle": inName.get() });
    outMat.setRef(inShader.get() || op.patch.cgl.getDefaultShader());
};

}
};

CABLES.OPS["baf968ea-e4df-4fca-9cda-e6ddd38a4200"]={f:Ops.Gl.GLTF.GltfSetMaterial,objName:"Ops.Gl.GLTF.GltfSetMaterial"};




// **************************************************************
// 
// Ops.Gl.GLTF.GltfScene_v4
// 
// **************************************************************

Ops.Gl.GLTF.GltfScene_v4= class extends CABLES.Op 
{
constructor()
{
super(...arguments);
const op=this;
const attachments=op.attachments={"inc_camera_js":"const gltfCamera = class\r\n{\r\n    constructor(gltf, node)\r\n    {\r\n        this.node = node;\r\n        this.name = node.name;\r\n        // console.log(gltf);\r\n        this.config = gltf.json.cameras[node.camera];\r\n\r\n        this.pos = vec3.create();\r\n        this.quat = quat.create();\r\n        this.vCenter = vec3.create();\r\n        this.vUp = vec3.create();\r\n        this.vMat = mat4.create();\r\n    }\r\n\r\n    updateAnim(time)\r\n    {\r\n        if (this.node && this.node._animTrans)\r\n        {\r\n            vec3.set(this.pos,\r\n                this.node._animTrans[0].getValue(time),\r\n                this.node._animTrans[1].getValue(time),\r\n                this.node._animTrans[2].getValue(time));\r\n\r\n            quat.set(this.quat,\r\n                this.node._animRot[0].getValue(time),\r\n                this.node._animRot[1].getValue(time),\r\n                this.node._animRot[2].getValue(time),\r\n                this.node._animRot[3].getValue(time));\r\n        }\r\n    }\r\n\r\n    start(time)\r\n    {\r\n        if (cgl.tempData.shadowPass) return;\r\n\r\n        this.updateAnim(time);\r\n        const asp = cgl.getViewPort()[2] / cgl.getViewPort()[3];\r\n\r\n        cgl.pushPMatrix();\r\n        // mat4.perspective(\r\n        //     cgl.pMatrix,\r\n        //     this.config.perspective.yfov*0.5,\r\n        //     asp,\r\n        //     this.config.perspective.znear,\r\n        //     this.config.perspective.zfar);\r\n\r\n        cgl.pushViewMatrix();\r\n        // mat4.identity(cgl.vMatrix);\r\n\r\n        // if(this.node && this.node.parent)\r\n        // {\r\n        //     console.log(this.node.parent)\r\n        // vec3.add(this.pos,this.pos,this.node.parent._node.translation);\r\n        // vec3.sub(this.vCenter,this.vCenter,this.node.parent._node.translation);\r\n        // mat4.translate(cgl.vMatrix,cgl.vMatrix,\r\n        // [\r\n        //     -this.node.parent._node.translation[0],\r\n        //     -this.node.parent._node.translation[1],\r\n        //     -this.node.parent._node.translation[2]\r\n        // ])\r\n        // }\r\n\r\n        // vec3.set(this.vUp, 0, 1, 0);\r\n        // vec3.set(this.vCenter, 0, -1, 0);\r\n        // // vec3.set(this.vCenter, 0, 1, 0);\r\n        // vec3.transformQuat(this.vCenter, this.vCenter, this.quat);\r\n        // vec3.normalize(this.vCenter, this.vCenter);\r\n        // vec3.add(this.vCenter, this.vCenter, this.pos);\r\n\r\n        // mat4.lookAt(cgl.vMatrix, this.pos, this.vCenter, this.vUp);\r\n\r\n        let mv = mat4.create();\r\n        mat4.invert(mv, this.node.modelMatAbs());\r\n\r\n        // console.log(this.node.modelMatAbs());\r\n\r\n        this.vMat = mv;\r\n\r\n        mat4.identity(cgl.vMatrix);\r\n        // console.log(mv);\r\n        mat4.mul(cgl.vMatrix, cgl.vMatrix, mv);\r\n    }\r\n\r\n    end()\r\n    {\r\n        if (cgl.tempData.shadowPass) return;\r\n        cgl.popPMatrix();\r\n        cgl.popViewMatrix();\r\n    }\r\n};\r\n","inc_gltf_js":"const le = true; // little endian\r\n\r\nconst Gltf = class\r\n{\r\n    constructor()\r\n    {\r\n        this.json = {};\r\n        this.accBuffers = [];\r\n        this.meshes = [];\r\n        this.nodes = [];\r\n        this.shaders = [];\r\n        this.timing = [];\r\n        this.cams = [];\r\n        this.startTime = performance.now();\r\n        this.bounds = new CABLES.CG.BoundingBox();\r\n        this.loaded = Date.now();\r\n        this.accBuffersDelete = [];\r\n    }\r\n\r\n    getNode(n)\r\n    {\r\n        for (let i = 0; i < this.nodes.length; i++)\r\n        {\r\n            if (this.nodes[i].name == n) return this.nodes[i];\r\n        }\r\n    }\r\n\r\n    unHideAll()\r\n    {\r\n        for (let i = 0; i < this.nodes.length; i++)\r\n        {\r\n            this.nodes[i].unHide();\r\n        }\r\n    }\r\n};\r\n\r\nfunction Utf8ArrayToStr(array)\r\n{\r\n    if (window.TextDecoder) return new TextDecoder(\"utf-8\").decode(array);\r\n\r\n    let out, i, len, c;\r\n    let char2, char3;\r\n\r\n    out = \"\";\r\n    len = array.length;\r\n    i = 0;\r\n    while (i < len)\r\n    {\r\n        c = array[i++];\r\n        switch (c >> 4)\r\n        {\r\n        case 0: case 1: case 2: case 3: case 4: case 5: case 6: case 7:\r\n            // 0xxxxxxx\r\n            out += String.fromCharCode(c);\r\n            break;\r\n        case 12: case 13:\r\n            // 110x xxxx   10xx xxxx\r\n            char2 = array[i++];\r\n            out += String.fromCharCode(((c & 0x1F) << 6) | (char2 & 0x3F));\r\n            break;\r\n        case 14:\r\n            // 1110 xxxx  10xx xxxx  10xx xxxx\r\n            char2 = array[i++];\r\n            char3 = array[i++];\r\n            out += String.fromCharCode(((c & 0x0F) << 12) |\r\n                    ((char2 & 0x3F) << 6) |\r\n                    ((char3 & 0x3F) << 0));\r\n            break;\r\n        }\r\n    }\r\n\r\n    return out;\r\n}\r\n\r\nfunction readChunk(dv, bArr, arrayBuffer, offset)\r\n{\r\n    const chunk = {};\r\n\r\n    if (offset >= dv.byteLength)\r\n    {\r\n        // op.log(\"could not read chunk...\");\r\n        return;\r\n    }\r\n    chunk.size = dv.getUint32(offset + 0, le);\r\n\r\n    // chunk.type = new TextDecoder(\"utf-8\").decode(bArr.subarray(offset+4, offset+4+4));\r\n    chunk.type = Utf8ArrayToStr(bArr.subarray(offset + 4, offset + 4 + 4));\r\n\r\n    if (chunk.type == \"BIN\\0\")\r\n    {\r\n        // console.log(chunk.size,arrayBuffer.length,offset);\r\n        // try\r\n        // {\r\n        chunk.dataView = new DataView(arrayBuffer, offset + 8, chunk.size);\r\n        // }\r\n        // catch(e)\r\n        // {\r\n        //     chunk.dataView = null;\r\n        //     console.log(e);\r\n        // }\r\n    }\r\n    else\r\n    if (chunk.type == \"JSON\")\r\n    {\r\n        const json = Utf8ArrayToStr(bArr.subarray(offset + 8, offset + 8 + chunk.size));\r\n\r\n        try\r\n        {\r\n            const obj = JSON.parse(json);\r\n            chunk.data = obj;\r\n            outGenerator.set(obj.asset.generator);\r\n        }\r\n        catch (e)\r\n        {\r\n        }\r\n    }\r\n    else\r\n    {\r\n        op.warn(\"unknown type\", chunk.type);\r\n    }\r\n\r\n    return chunk;\r\n}\r\n\r\nfunction loadAnims(gltf)\r\n{\r\n    const uniqueAnimNames = {};\r\n\r\n    for (let i = 0; i < gltf.json.animations.length; i++)\r\n    {\r\n        const an = gltf.json.animations[i];\r\n\r\n        an.name = an.name || \"unknown\";\r\n\r\n        for (let ia = 0; ia < an.channels.length; ia++)\r\n        {\r\n            const chan = an.channels[ia];\r\n\r\n            const node = gltf.nodes[chan.target.node];\r\n            const sampler = an.samplers[chan.sampler];\r\n\r\n            const acc = gltf.json.accessors[sampler.input];\r\n            const bufferIn = gltf.accBuffers[sampler.input];\r\n\r\n            const accOut = gltf.json.accessors[sampler.output];\r\n            const bufferOut = gltf.accBuffers[sampler.output];\r\n\r\n            gltf.accBuffersDelete.push(sampler.output, sampler.input);\r\n\r\n            if (bufferIn && bufferOut)\r\n            {\r\n                let numComps = 1;\r\n                if (accOut.type === \"VEC2\")numComps = 2;\r\n                else if (accOut.type === \"VEC3\")numComps = 3;\r\n                else if (accOut.type === \"VEC4\")numComps = 4;\r\n                else if (accOut.type === \"SCALAR\")\r\n                {\r\n                    numComps = bufferOut.length / bufferIn.length; // is this really the way to find out ? cant find any other way,except number of morph targets, but not really connected...\r\n                }\r\n                else op.log(\"[] UNKNOWN accOut.type\", accOut.type);\r\n\r\n                const anims = [];\r\n\r\n                uniqueAnimNames[an.name] = true;\r\n\r\n                for (let k = 0; k < numComps; k++)\r\n                {\r\n                    const newAnim = new CABLES.Anim();\r\n                    // newAnim.name=an.name;\r\n                    anims.push(newAnim);\r\n                }\r\n\r\n                if (sampler.interpolation === \"LINEAR\") {}\r\n                else if (sampler.interpolation === \"STEP\") for (let k = 0; k < numComps; k++) anims[k].defaultEasing = CABLES.EASING_ABSOLUTE;\r\n                else if (sampler.interpolation === \"CUBICSPLINE\") for (let k = 0; k < numComps; k++) anims[k].defaultEasing = CABLES.EASING_CUBICSPLINE;\r\n                else op.warn(\"unknown interpolation\", sampler.interpolation);\r\n\r\n                // console.log(bufferOut)\r\n\r\n                // if there is no keyframe for time 0 copy value of first keyframe at time 0\r\n                if (bufferIn[0] !== 0.0)\r\n                    for (let k = 0; k < numComps; k++)\r\n                        anims[k].setValue(0, bufferOut[0 * numComps + k]);\r\n\r\n                for (let j = 0; j < bufferIn.length; j++)\r\n                {\r\n                    maxTime = Math.max(bufferIn[j], maxTime);\r\n\r\n                    for (let k = 0; k < numComps; k++)\r\n                    {\r\n                        if (anims[k].defaultEasing === CABLES.EASING_CUBICSPLINE)\r\n                        {\r\n                            const idx = ((j * numComps) * 3 + k);\r\n\r\n                            const key = anims[k].setValue(bufferIn[j], bufferOut[idx + numComps]);\r\n                            key.bezTangIn = bufferOut[idx];\r\n                            key.bezTangOut = bufferOut[idx + (numComps * 2)];\r\n\r\n                            // console.log(an.name,k,bufferOut[idx+1]);\r\n                        }\r\n                        else\r\n                        {\r\n                            // console.log(an.name,k,bufferOut[j * numComps + k]);\r\n                            anims[k].setValue(bufferIn[j], bufferOut[j * numComps + k]);\r\n                        }\r\n                    }\r\n                }\r\n\r\n                node.setAnim(chan.target.path, an.name, anims);\r\n            }\r\n            else\r\n            {\r\n                op.warn(\"loadAmins bufferIn undefined \", bufferIn === undefined);\r\n                op.warn(\"loadAmins bufferOut undefined \", bufferOut === undefined);\r\n                op.warn(\"loadAmins \", an.name, sampler, accOut);\r\n                op.warn(\"loadAmins num accBuffers\", gltf.accBuffers.length);\r\n                op.warn(\"loadAmins num accessors\", gltf.json.accessors.length);\r\n            }\r\n        }\r\n    }\r\n\r\n    gltf.uniqueAnimNames = uniqueAnimNames;\r\n\r\n    outAnims.setRef(Object.keys(uniqueAnimNames));\r\n}\r\n\r\nfunction loadCams(gltf)\r\n{\r\n    if (!gltf || !gltf.json.cameras) return;\r\n\r\n    gltf.cameras = gltf.cameras || [];\r\n\r\n    for (let i = 0; i < gltf.nodes.length; i++)\r\n    {\r\n        if (gltf.nodes[i].hasOwnProperty(\"camera\"))\r\n        {\r\n            const cam = new gltfCamera(gltf, gltf.nodes[i]);\r\n            gltf.cameras.push(cam);\r\n        }\r\n    }\r\n}\r\n\r\nfunction loadAfterDraco()\r\n{\r\n    if (!window.DracoDecoder)\r\n    {\r\n        setTimeout(() =>\r\n        {\r\n            loadAfterDraco();\r\n        }, 100);\r\n    }\r\n\r\n    reloadSoon();\r\n}\r\n\r\nfunction parseGltf(arrayBuffer)\r\n{\r\n    const CHUNK_HEADER_SIZE = 8;\r\n\r\n    let j = 0, i = 0;\r\n\r\n    const gltf = new Gltf();\r\n    gltf.timing.push([\"Start parsing\", Math.round((performance.now() - gltf.startTime))]);\r\n\r\n    if (!arrayBuffer) return;\r\n    const byteArray = new Uint8Array(arrayBuffer);\r\n    let pos = 0;\r\n\r\n    // var string = new TextDecoder(\"utf-8\").decode(byteArray.subarray(pos, 4));\r\n    const string = Utf8ArrayToStr(byteArray.subarray(pos, 4));\r\n    pos += 4;\r\n    if (string != \"glTF\") return;\r\n\r\n    gltf.timing.push([\"dataview\", Math.round((performance.now() - gltf.startTime))]);\r\n\r\n    const dv = new DataView(arrayBuffer);\r\n    const version = dv.getUint32(pos, le);\r\n    pos += 4;\r\n    const size = dv.getUint32(pos, le);\r\n    pos += 4;\r\n\r\n    outVersion.set(version);\r\n\r\n    const chunks = [];\r\n    gltf.chunks = chunks;\r\n\r\n    chunks.push(readChunk(dv, byteArray, arrayBuffer, pos));\r\n    pos += chunks[0].size + CHUNK_HEADER_SIZE;\r\n    gltf.json = chunks[0].data;\r\n\r\n    gltf.cables = {\r\n        \"fileUrl\": inFile.get(),\r\n        \"shortFileName\": CABLES.basename(inFile.get())\r\n    };\r\n\r\n    outJson.setRef(gltf.json);\r\n    outExtensions.setRef(gltf.json.extensionsUsed || []);\r\n\r\n    let ch = readChunk(dv, byteArray, arrayBuffer, pos);\r\n    while (ch)\r\n    {\r\n        chunks.push(ch);\r\n        pos += ch.size + CHUNK_HEADER_SIZE;\r\n        ch = readChunk(dv, byteArray, arrayBuffer, pos);\r\n    }\r\n\r\n    gltf.chunks = chunks;\r\n\r\n    const views = chunks[0].data.bufferViews;\r\n    const accessors = chunks[0].data.accessors;\r\n\r\n    gltf.timing.push([\"Parse buffers\", Math.round((performance.now() - gltf.startTime))]);\r\n\r\n    if (gltf.json.extensionsUsed && gltf.json.extensionsUsed.indexOf(\"KHR_draco_mesh_compression\") > -1)\r\n    {\r\n        if (!window.DracoDecoder)\r\n        {\r\n            op.setUiError(\"gltfdraco\", \"GLTF draco compression lib not found / add draco op to your patch!\");\r\n\r\n            loadAfterDraco();\r\n            return gltf;\r\n        }\r\n        else\r\n        {\r\n            gltf.useDraco = true;\r\n        }\r\n    }\r\n\r\n    op.setUiError(\"gltfdraco\", null);\r\n    // let accPos = (view.byteOffset || 0) + (acc.byteOffset || 0);\r\n\r\n    if (views)\r\n    {\r\n        for (i = 0; i < accessors.length; i++)\r\n        {\r\n            const acc = accessors[i];\r\n            const view = views[acc.bufferView];\r\n\r\n            let numComps = 0;\r\n            if (acc.type == \"SCALAR\")numComps = 1;\r\n            else if (acc.type == \"VEC2\")numComps = 2;\r\n            else if (acc.type == \"VEC3\")numComps = 3;\r\n            else if (acc.type == \"VEC4\")numComps = 4;\r\n            else if (acc.type == \"MAT4\")numComps = 16;\r\n            else console.error(\"unknown accessor type\", acc.type);\r\n\r\n            //   const decoder = new decoderModule.Decoder();\r\n            //   const decodedGeometry = decodeDracoData(data, decoder);\r\n            //   // Encode mesh\r\n            //   encodeMeshToFile(decodedGeometry, decoder);\r\n\r\n            //   decoderModule.destroy(decoder);\r\n            //   decoderModule.destroy(decodedGeometry);\r\n\r\n            // 5120 (BYTE)\t1\r\n            // 5121 (UNSIGNED_BYTE)\t1\r\n            // 5122 (SHORT)\t2\r\n\r\n            if (chunks[1].dataView)\r\n            {\r\n                if (view)\r\n                {\r\n                    const num = acc.count * numComps;\r\n                    let accPos = (view.byteOffset || 0) + (acc.byteOffset || 0);\r\n                    let stride = view.byteStride || 0;\r\n                    let dataBuff = null;\r\n\r\n                    if (acc.componentType == 5126 || acc.componentType == 5125) // 4byte FLOAT or INT\r\n                    {\r\n                        stride = stride || 4;\r\n\r\n                        const isInt = acc.componentType == 5125;\r\n                        if (isInt)dataBuff = new Uint32Array(num);\r\n                        else dataBuff = new Float32Array(num);\r\n\r\n                        dataBuff.cblStride = numComps;\r\n\r\n                        for (j = 0; j < num; j++)\r\n                        {\r\n                            if (isInt) dataBuff[j] = chunks[1].dataView.getUint32(accPos, le);\r\n                            else dataBuff[j] = chunks[1].dataView.getFloat32(accPos, le);\r\n\r\n                            if (stride != 4 && (j + 1) % numComps === 0)accPos += stride - (numComps * 4);\r\n                            accPos += 4;\r\n                        }\r\n                    }\r\n                    else if (acc.componentType == 5123) // UNSIGNED_SHORT\r\n                    {\r\n                        stride = stride || 2;\r\n\r\n                        dataBuff = new Uint16Array(num);\r\n                        dataBuff.cblStride = stride;\r\n\r\n                        for (j = 0; j < num; j++)\r\n                        {\r\n                            dataBuff[j] = chunks[1].dataView.getUint16(accPos, le);\r\n\r\n                            if (stride != 2 && (j + 1) % numComps === 0) accPos += stride - (numComps * 2);\r\n\r\n                            accPos += 2;\r\n                        }\r\n                    }\r\n                    else if (acc.componentType == 5121) // UNSIGNED_BYTE\r\n                    {\r\n                        stride = stride || 1;\r\n\r\n                        dataBuff = new Uint8Array(num);\r\n                        dataBuff.cblStride = stride;\r\n\r\n                        for (j = 0; j < num; j++)\r\n                        {\r\n                            dataBuff[j] = chunks[1].dataView.getUint8(accPos, le);\r\n\r\n                            if (stride != 1 && (j + 1) % numComps === 0) accPos += stride - (numComps * 1);\r\n\r\n                            accPos += 1;\r\n                        }\r\n                    }\r\n\r\n                    else\r\n                    {\r\n                        console.error(\"unknown component type\", acc.componentType);\r\n                    }\r\n\r\n                    gltf.accBuffers.push(dataBuff);\r\n                }\r\n                else\r\n                {\r\n                    // console.log(\"has no dataview\");\r\n                }\r\n            }\r\n        }\r\n    }\r\n\r\n    gltf.timing.push([\"Parse mesh groups\", Math.round((performance.now() - gltf.startTime))]);\r\n\r\n    gltf.json.meshes = gltf.json.meshes || [];\r\n\r\n    if (gltf.json.meshes)\r\n    {\r\n        for (i = 0; i < gltf.json.meshes.length; i++)\r\n        {\r\n            const mesh = new gltfMeshGroup(gltf, gltf.json.meshes[i]);\r\n            gltf.meshes.push(mesh);\r\n        }\r\n    }\r\n\r\n    gltf.timing.push([\"Parse nodes\", Math.round((performance.now() - gltf.startTime))]);\r\n\r\n    for (i = 0; i < gltf.json.nodes.length; i++)\r\n    {\r\n        if (gltf.json.nodes[i].children)\r\n            for (j = 0; j < gltf.json.nodes[i].children.length; j++)\r\n            {\r\n                gltf.json.nodes[gltf.json.nodes[i].children[j]].isChild = true;\r\n            }\r\n    }\r\n\r\n    for (i = 0; i < gltf.json.nodes.length; i++)\r\n    {\r\n        const node = new gltfNode(gltf.json.nodes[i], gltf);\r\n        gltf.nodes.push(node);\r\n    }\r\n\r\n    for (i = 0; i < gltf.nodes.length; i++)\r\n    {\r\n        const node = gltf.nodes[i];\r\n\r\n        if (!node.children) continue;\r\n        for (let j = 0; j < node.children.length; j++)\r\n        {\r\n            gltf.nodes[node.children[j]].parent = node;\r\n        }\r\n    }\r\n\r\n    for (i = 0; i < gltf.nodes.length; i++)\r\n    {\r\n        gltf.nodes[i].initSkin();\r\n    }\r\n\r\n    needsMatUpdate = true;\r\n\r\n    gltf.timing.push([\"load anims\", Math.round((performance.now() - gltf.startTime))]);\r\n\r\n    if (gltf.json.animations) loadAnims(gltf);\r\n\r\n    gltf.timing.push([\"load cameras\", Math.round((performance.now() - gltf.startTime))]);\r\n\r\n    if (gltf.json.cameras) loadCams(gltf);\r\n\r\n    gltf.timing.push([\"finished\", Math.round((performance.now() - gltf.startTime))]);\r\n    return gltf;\r\n}\r\n","inc_mesh_js":"let gltfMesh = class\r\n{\r\n    constructor(name, prim, gltf, finished)\r\n    {\r\n        this.POINTS = 0;\r\n        this.LINES = 1;\r\n        this.LINE_LOOP = 2;\r\n        this.LINE_STRIP = 3;\r\n        this.TRIANGLES = 4;\r\n        this.TRIANGLE_STRIP = 5;\r\n        this.TRIANGLE_FAN = 6;\r\n\r\n        this.test = 0;\r\n        this.name = name;\r\n        this.submeshIndex = 0;\r\n        this.material = prim.material;\r\n        this.mesh = null;\r\n        this.geom = new CGL.Geometry(\"gltf_\" + this.name);\r\n        this.geom.verticesIndices = [];\r\n        this.bounds = null;\r\n        this.primitive = 4;\r\n        this.morphTargetsRenderMod = null;\r\n        this.weights = prim.weights;\r\n\r\n        if (prim.hasOwnProperty(\"mode\")) this.primitive = prim.mode;\r\n\r\n        if (prim.hasOwnProperty(\"indices\")) this.geom.verticesIndices = gltf.accBuffers[prim.indices];\r\n\r\n        gltf.loadingMeshes = gltf.loadingMeshes || 0;\r\n        gltf.loadingMeshes++;\r\n\r\n        this.materialJson =\r\n            this._matPbrMetalness =\r\n            this._matPbrRoughness =\r\n            this._matDiffuseColor = null;\r\n\r\n        if (gltf.json.materials)\r\n        {\r\n            if (this.material != -1) this.materialJson = gltf.json.materials[this.material];\r\n\r\n            if (this.materialJson && this.materialJson.pbrMetallicRoughness)\r\n            {\r\n                if (!this.materialJson.pbrMetallicRoughness.hasOwnProperty(\"baseColorFactor\"))\r\n                {\r\n                    this._matDiffuseColor = [1, 1, 1, 1];\r\n                }\r\n                else\r\n                {\r\n                    this._matDiffuseColor = this.materialJson.pbrMetallicRoughness.baseColorFactor;\r\n                }\r\n\r\n                this._matDiffuseColor = this.materialJson.pbrMetallicRoughness.baseColorFactor;\r\n\r\n                if (!this.materialJson.pbrMetallicRoughness.hasOwnProperty(\"metallicFactor\"))\r\n                {\r\n                    this._matPbrMetalness = 1.0;\r\n                }\r\n                else\r\n                {\r\n                    this._matPbrMetalness = this.materialJson.pbrMetallicRoughness.metallicFactor || null;\r\n                }\r\n\r\n                if (!this.materialJson.pbrMetallicRoughness.hasOwnProperty(\"roughnessFactor\"))\r\n                {\r\n                    this._matPbrRoughness = 1.0;\r\n                }\r\n                else\r\n                {\r\n                    this._matPbrRoughness = this.materialJson.pbrMetallicRoughness.roughnessFactor || null;\r\n                }\r\n            }\r\n        }\r\n\r\n        if (gltf.useDraco && prim.extensions.KHR_draco_mesh_compression)\r\n        {\r\n            const view = gltf.chunks[0].data.bufferViews[prim.extensions.KHR_draco_mesh_compression.bufferView];\r\n            const num = view.byteLength;\r\n            const dataBuff = new Int8Array(num);\r\n            let accPos = (view.byteOffset || 0);// + (acc.byteOffset || 0);\r\n            for (let j = 0; j < num; j++)\r\n            {\r\n                dataBuff[j] = gltf.chunks[1].dataView.getInt8(accPos, le);\r\n                accPos++;\r\n            }\r\n\r\n            const dracoDecoder = window.DracoDecoder;\r\n            dracoDecoder.decodeGeometry(dataBuff.buffer, (geometry) =>\r\n            {\r\n                const geom = new CGL.Geometry(\"draco mesh \" + name);\r\n\r\n                for (let i = 0; i < geometry.attributes.length; i++)\r\n                {\r\n                    const attr = geometry.attributes[i];\r\n\r\n                    if (attr.name === \"position\") geom.vertices = attr.array;\r\n                    else if (attr.name === \"normal\") geom.vertexNormals = attr.array;\r\n                    else if (attr.name === \"uv\") geom.texCoords = attr.array;\r\n                    else if (attr.name === \"color\") geom.vertexColors = this.calcVertexColors(attr.array);\r\n                    else if (attr.name === \"joints\") geom.setAttribute(\"attrJoints\", Array.from(attr.array), 4);\r\n                    else if (attr.name === \"weights\")\r\n                    {\r\n                        const arr4 = new Float32Array(attr.array.length / attr.itemSize * 4);\r\n\r\n                        for (let k = 0; k < attr.array.length / attr.itemSize; k++)\r\n                        {\r\n                            arr4[k * 4] = arr4[k * 4 + 1] = arr4[k * 4 + 2] = arr4[k * 4 + 3] = 0;\r\n                            for (let j = 0; j < attr.itemSize; j++)\r\n                                arr4[k * 4 + j] = attr.array[k * attr.itemSize + j];\r\n                        }\r\n                        geom.setAttribute(\"attrWeights\", arr4, 4);\r\n                    }\r\n                    else op.logWarn(\"unknown draco attrib\", attr);\r\n                }\r\n\r\n                geometry.attributes = null;\r\n                geom.verticesIndices = geometry.index.array;\r\n\r\n                this.setGeom(geom);\r\n\r\n                this.mesh = null;\r\n                gltf.loadingMeshes--;\r\n                gltf.timing.push([\"draco decode\", Math.round((performance.now() - gltf.startTime))]);\r\n\r\n                if (finished)finished(this);\r\n            }, (error) => { op.logError(error); });\r\n        }\r\n        else\r\n        {\r\n            gltf.loadingMeshes--;\r\n            this.fillGeomAttribs(gltf, this.geom, prim.attributes);\r\n\r\n            if (prim.targets)\r\n            {\r\n                for (let j = 0; j < prim.targets.length; j++)\r\n                {\r\n                    const tgeom = new CGL.Geometry(\"gltf_target_\" + j);\r\n\r\n                    // if (prim.hasOwnProperty(\"indices\")) tgeom.verticesIndices = gltf.accBuffers[prim.indices];\r\n\r\n                    this.fillGeomAttribs(gltf, tgeom, prim.targets[j], false);\r\n\r\n                    // { // calculate normals for final position of morphtarget for later...\r\n                    //     for (let i = 0; i < tgeom.vertices.length; i++) tgeom.vertices[i] += this.geom.vertices[i];\r\n                    //     tgeom.calculateNormals();\r\n                    //     for (let i = 0; i < tgeom.vertices.length; i++) tgeom.vertices[i] -= this.geom.vertices[i];\r\n                    // }\r\n\r\n                    this.geom.morphTargets.push(tgeom);\r\n                }\r\n            }\r\n            if (finished)finished(this);\r\n        }\r\n    }\r\n\r\n    _linearToSrgb(x)\r\n    {\r\n        if (x <= 0)\r\n            return 0;\r\n        else if (x >= 1)\r\n            return 1;\r\n        else if (x < 0.0031308)\r\n            return x * 12.92;\r\n        else\r\n            return x ** (1 / 2.2) * 1.055 - 0.055;\r\n    }\r\n\r\n    calcVertexColors(arr, type)\r\n    {\r\n        let vertexColors = null;\r\n        if (arr instanceof Float32Array)\r\n        {\r\n            let div = false;\r\n            for (let i = 0; i < arr.length; i++)\r\n            {\r\n                if (arr[i] > 1)\r\n                {\r\n                    div = true;\r\n                    continue;\r\n                }\r\n            }\r\n\r\n            if (div)\r\n                for (let i = 0; i < arr.length; i++) arr[i] /= 65535;\r\n\r\n            vertexColors = arr;\r\n        }\r\n\r\n        else if (arr instanceof Uint16Array)\r\n        {\r\n            const fb = new Float32Array(arr.length);\r\n            for (let i = 0; i < arr.length; i++) fb[i] = arr[i] / 65535;\r\n\r\n            vertexColors = fb;\r\n        }\r\n        else vertexColors = arr;\r\n\r\n        for (let i = 0; i < vertexColors.length; i++)\r\n        {\r\n            vertexColors[i] = this._linearToSrgb(vertexColors[i]);\r\n        }\r\n\r\n        if (arr.cblStride == 3)\r\n        {\r\n            const nc = new Float32Array(vertexColors.length / 3 * 4);\r\n            for (let i = 0; i < vertexColors.length / 3; i++)\r\n            {\r\n                nc[i * 4 + 0] = vertexColors[i * 3 + 0];\r\n                nc[i * 4 + 1] = vertexColors[i * 3 + 1];\r\n                nc[i * 4 + 2] = vertexColors[i * 3 + 2];\r\n                nc[i * 4 + 3] = 1;\r\n            }\r\n            vertexColors = nc;\r\n        }\r\n\r\n        return vertexColors;\r\n    }\r\n\r\n    fillGeomAttribs(gltf, tgeom, attribs, setGeom)\r\n    {\r\n        if (attribs.hasOwnProperty(\"POSITION\")) tgeom.vertices = gltf.accBuffers[attribs.POSITION];\r\n        if (attribs.hasOwnProperty(\"NORMAL\")) tgeom.vertexNormals = gltf.accBuffers[attribs.NORMAL];\r\n        if (attribs.hasOwnProperty(\"TANGENT\")) tgeom.tangents = gltf.accBuffers[attribs.TANGENT];\r\n\r\n        // // console.log(gltf.accBuffers[attribs.COLOR_0])\r\n        // console.log(gltf);\r\n\r\n        if (attribs.hasOwnProperty(\"COLOR_0\")) tgeom.vertexColors = this.calcVertexColors(gltf.accBuffers[attribs.COLOR_0], gltf.accBuffers[attribs.COLOR_0].type);\r\n        if (attribs.hasOwnProperty(\"COLOR_1\")) tgeom.setAttribute(\"attrVertColor1\", this.calcVertexColors(gltf.accBuffers[attribs.COLOR_1]), gltf.accBuffers[attribs.COLOR_1].type);\r\n        if (attribs.hasOwnProperty(\"COLOR_2\")) tgeom.setAttribute(\"attrVertColor2\", this.calcVertexColors(gltf.accBuffers[attribs.COLOR_2]), gltf.accBuffers[attribs.COLOR_2].type);\r\n        if (attribs.hasOwnProperty(\"COLOR_3\")) tgeom.setAttribute(\"attrVertColor3\", this.calcVertexColors(gltf.accBuffers[attribs.COLOR_3]), gltf.accBuffers[attribs.COLOR_3].type);\r\n        if (attribs.hasOwnProperty(\"COLOR_4\")) tgeom.setAttribute(\"attrVertColor4\", this.calcVertexColors(gltf.accBuffers[attribs.COLOR_4]), gltf.accBuffers[attribs.COLOR_4].type);\r\n\r\n        if (attribs.hasOwnProperty(\"TEXCOORD_0\")) tgeom.texCoords = gltf.accBuffers[attribs.TEXCOORD_0];\r\n        if (attribs.hasOwnProperty(\"TEXCOORD_1\")) tgeom.setAttribute(\"attrTexCoord1\", gltf.accBuffers[attribs.TEXCOORD_1], 2);\r\n        if (attribs.hasOwnProperty(\"TEXCOORD_2\")) tgeom.setAttribute(\"attrTexCoord2\", gltf.accBuffers[attribs.TEXCOORD_2], 2);\r\n        if (attribs.hasOwnProperty(\"TEXCOORD_3\")) tgeom.setAttribute(\"attrTexCoord3\", gltf.accBuffers[attribs.TEXCOORD_3], 2);\r\n        if (attribs.hasOwnProperty(\"TEXCOORD_4\")) tgeom.setAttribute(\"attrTexCoord4\", gltf.accBuffers[attribs.TEXCOORD_4], 2);\r\n\r\n        if (attribs.hasOwnProperty(\"WEIGHTS_0\"))\r\n        {\r\n            tgeom.setAttribute(\"attrWeights\", gltf.accBuffers[attribs.WEIGHTS_0], 4);\r\n        }\r\n        if (attribs.hasOwnProperty(\"JOINTS_0\"))\r\n        {\r\n            if (!gltf.accBuffers[attribs.JOINTS_0])console.log(\"no !gltf.accBuffers[attribs.JOINTS_0]\");\r\n            tgeom.setAttribute(\"attrJoints\", gltf.accBuffers[attribs.JOINTS_0], 4);\r\n        }\r\n\r\n        if (attribs.hasOwnProperty(\"POSITION\")) gltf.accBuffersDelete.push(attribs.POSITION);\r\n        if (attribs.hasOwnProperty(\"NORMAL\")) gltf.accBuffersDelete.push(attribs.NORMAL);\r\n        if (attribs.hasOwnProperty(\"TEXCOORD_0\")) gltf.accBuffersDelete.push(attribs.TEXCOORD_0);\r\n        if (attribs.hasOwnProperty(\"TANGENT\")) gltf.accBuffersDelete.push(attribs.TANGENT);\r\n        if (attribs.hasOwnProperty(\"COLOR_0\"))gltf.accBuffersDelete.push(attribs.COLOR_0);\r\n        if (attribs.hasOwnProperty(\"COLOR_0\"))gltf.accBuffersDelete.push(attribs.COLOR_0);\r\n        if (attribs.hasOwnProperty(\"COLOR_1\"))gltf.accBuffersDelete.push(attribs.COLOR_1);\r\n        if (attribs.hasOwnProperty(\"COLOR_2\"))gltf.accBuffersDelete.push(attribs.COLOR_2);\r\n        if (attribs.hasOwnProperty(\"COLOR_3\"))gltf.accBuffersDelete.push(attribs.COLOR_3);\r\n\r\n        if (attribs.hasOwnProperty(\"TEXCOORD_1\")) gltf.accBuffersDelete.push(attribs.TEXCOORD_1);\r\n        if (attribs.hasOwnProperty(\"TEXCOORD_2\")) gltf.accBuffersDelete.push(attribs.TEXCOORD_2);\r\n        if (attribs.hasOwnProperty(\"TEXCOORD_3\")) gltf.accBuffersDelete.push(attribs.TEXCOORD_3);\r\n        if (attribs.hasOwnProperty(\"TEXCOORD_4\")) gltf.accBuffersDelete.push(attribs.TEXCOORD_4);\r\n\r\n        if (setGeom !== false) if (tgeom && tgeom.verticesIndices) this.setGeom(tgeom);\r\n    }\r\n\r\n    setGeom(geom)\r\n    {\r\n        if (inNormFormat.get() == \"X-ZY\")\r\n        {\r\n            for (let i = 0; i < geom.vertexNormals.length; i += 3)\r\n            {\r\n                let t = geom.vertexNormals[i + 2];\r\n                geom.vertexNormals[i + 2] = geom.vertexNormals[i + 1];\r\n                geom.vertexNormals[i + 1] = -t;\r\n            }\r\n        }\r\n\r\n        if (inVertFormat.get() == \"XZ-Y\")\r\n        {\r\n            for (let i = 0; i < geom.vertices.length; i += 3)\r\n            {\r\n                let t = geom.vertices[i + 2];\r\n                geom.vertices[i + 2] = -geom.vertices[i + 1];\r\n                geom.vertices[i + 1] = t;\r\n            }\r\n        }\r\n\r\n        if (this.primitive == this.TRIANGLES)\r\n        {\r\n            if (inCalcNormals.get() == \"Force Smooth\" || inCalcNormals.get() == false) geom.calculateNormals();\r\n            else if (!geom.vertexNormals.length && inCalcNormals.get() == \"Auto\") geom.calculateNormals({ \"smooth\": false });\r\n\r\n            if ((!geom.biTangents || geom.biTangents.length == 0) && geom.tangents)\r\n            {\r\n                const bitan = vec3.create();\r\n                const tan = vec3.create();\r\n\r\n                const tangents = geom.tangents;\r\n                geom.tangents = new Float32Array(tangents.length / 4 * 3);\r\n                geom.biTangents = new Float32Array(tangents.length / 4 * 3);\r\n\r\n                for (let i = 0; i < tangents.length; i += 4)\r\n                {\r\n                    const idx = i / 4 * 3;\r\n\r\n                    vec3.cross(\r\n                        bitan,\r\n                        [geom.vertexNormals[idx], geom.vertexNormals[idx + 1], geom.vertexNormals[idx + 2]],\r\n                        [tangents[i], tangents[i + 1], tangents[i + 2]]\r\n                    );\r\n\r\n                    vec3.div(bitan, bitan, [tangents[i + 3], tangents[i + 3], tangents[i + 3]]);\r\n                    vec3.normalize(bitan, bitan);\r\n\r\n                    geom.biTangents[idx + 0] = bitan[0];\r\n                    geom.biTangents[idx + 1] = bitan[1];\r\n                    geom.biTangents[idx + 2] = bitan[2];\r\n\r\n                    geom.tangents[idx + 0] = tangents[i + 0];\r\n                    geom.tangents[idx + 1] = tangents[i + 1];\r\n                    geom.tangents[idx + 2] = tangents[i + 2];\r\n                }\r\n            }\r\n\r\n            if (geom.tangents.length === 0 || inCalcNormals.get() != \"Never\")\r\n            {\r\n                // console.log(\"[gltf ]no tangents... calculating tangents...\");\r\n                geom.calcTangentsBitangents();\r\n            }\r\n        }\r\n\r\n        this.geom = geom;\r\n\r\n        this.bounds = geom.getBounds();\r\n    }\r\n\r\n    render(cgl, ignoreMaterial, skinRenderer)\r\n    {\r\n        if (!this.mesh && this.geom && this.geom.verticesIndices)\r\n        {\r\n            let g = this.geom;\r\n            if (this.geom.vertices.length / 3 > 64000 && this.geom.verticesIndices.length > 0)\r\n            {\r\n                g = this.geom.copy();\r\n                g.unIndex(false, true);\r\n            }\r\n\r\n            let glprim;\r\n\r\n            if (cgl.gl)\r\n            {\r\n                if (this.primitive == this.TRIANGLES)glprim = cgl.gl.TRIANGLES;\r\n                else if (this.primitive == this.LINES)glprim = cgl.gl.LINES;\r\n                else if (this.primitive == this.LINE_STRIP)glprim = cgl.gl.LINE_STRIP;\r\n                else if (this.primitive == this.POINTS)glprim = cgl.gl.POINTS;\r\n                else\r\n                {\r\n                    op.logWarn(\"unknown primitive type\", this);\r\n                }\r\n            }\r\n\r\n            this.mesh = op.patch.cg.createMesh(g, { \"glPrimitive\": glprim });\r\n        }\r\n\r\n        if (this.mesh)\r\n        {\r\n            // update morphTargets\r\n            if (this.geom && this.geom.morphTargets.length && !this.morphTargetsRenderMod)\r\n            {\r\n                this.mesh.addVertexNumbers = true;\r\n                this.morphTargetsRenderMod = new GltfTargetsRenderer(this);\r\n            }\r\n\r\n            let useMat = !ignoreMaterial && this.material != -1 && gltf.shaders[this.material];\r\n            if (skinRenderer)useMat = false;\r\n\r\n            if (useMat) cgl.pushShader(gltf.shaders[this.material]);\r\n\r\n            const currentShader = cgl.getShader() || {};\r\n            const uniDiff = currentShader.uniformColorDiffuse;\r\n\r\n            const uniPbrMetalness = currentShader.uniformPbrMetalness;\r\n            const uniPbrRoughness = currentShader.uniformPbrRoughness;\r\n\r\n            // if (gltf.shaders[this.material] && !inUseMatProps.get())\r\n            // {\r\n            //     gltf.shaders[this.material]=null;\r\n            // }\r\n\r\n            if (!gltf.shaders[this.material] && inUseMatProps.get())\r\n            {\r\n                if (uniDiff && this._matDiffuseColor)\r\n                {\r\n                    this._matDiffuseColorOrig = [uniDiff.getValue()[0], uniDiff.getValue()[1], uniDiff.getValue()[2], uniDiff.getValue()[3]];\r\n                    uniDiff.setValue(this._matDiffuseColor);\r\n                }\r\n\r\n                if (uniPbrMetalness)\r\n                    if (this._matPbrMetalness != null)\r\n                    {\r\n                        this._matPbrMetalnessOrig = uniPbrMetalness.getValue();\r\n                        uniPbrMetalness.setValue(this._matPbrMetalness);\r\n                    }\r\n                    else\r\n                        uniPbrMetalness.setValue(0);\r\n\r\n                if (uniPbrRoughness)\r\n                    if (this._matPbrRoughness != null)\r\n                    {\r\n                        this._matPbrRoughnessOrig = uniPbrRoughness.getValue();\r\n                        uniPbrRoughness.setValue(this._matPbrRoughness);\r\n                    }\r\n                    else\r\n                    {\r\n                        uniPbrRoughness.setValue(0);\r\n                    }\r\n            }\r\n\r\n            if (this.morphTargetsRenderMod) this.morphTargetsRenderMod.renderStart(cgl, 0);\r\n            if (this.mesh)\r\n            {\r\n                this.mesh.render(cgl.getShader(), ignoreMaterial);\r\n            }\r\n            if (this.morphTargetsRenderMod) this.morphTargetsRenderMod.renderFinish(cgl);\r\n\r\n            if (inUseMatProps.get())\r\n            {\r\n                if (uniDiff && this._matDiffuseColor) uniDiff.setValue(this._matDiffuseColorOrig);\r\n                if (uniPbrMetalness && this._matPbrMetalnessOrig != undefined) uniPbrMetalness.setValue(this._matPbrMetalnessOrig);\r\n                if (uniPbrRoughness && this._matPbrRoughnessOrig != undefined) uniPbrRoughness.setValue(this._matPbrRoughnessOrig);\r\n            }\r\n\r\n            if (useMat) cgl.popShader();\r\n        }\r\n        else\r\n        {\r\n            console.log(\"no mesh......\");\r\n        }\r\n    }\r\n};\r\n","inc_meshGroup_js":"const gltfMeshGroup = class\r\n{\r\n    constructor(gltf, m)\r\n    {\r\n        this.bounds = new CABLES.CG.BoundingBox();\r\n        this.meshes = [];\r\n\r\n        m.name = m.name || (\"unknown mesh \" + CABLES.simpleId());\r\n\r\n        this.name = m.name;\r\n        const prims = m.primitives;\r\n\r\n        for (let i = 0; i < prims.length; i++)\r\n        {\r\n            const mesh = new gltfMesh(this.name, prims[i], gltf,\r\n                (mesh) =>\r\n                {\r\n                    mesh.extras = m.extras;\r\n                    this.bounds.apply(mesh.bounds);\r\n                });\r\n\r\n            mesh.submeshIndex = i;\r\n            this.meshes.push(mesh);\r\n        }\r\n    }\r\n\r\n    render(cgl, ignoreMat, skinRenderer, _time, weights)\r\n    {\r\n        for (let i = 0; i < this.meshes.length; i++)\r\n        {\r\n            const useMat = gltf.shaders[this.meshes[i].material];\r\n\r\n            if (!ignoreMat && useMat) cgl.pushShader(gltf.shaders[this.meshes[i].material]);\r\n            if (skinRenderer)skinRenderer.renderStart(cgl, _time);\r\n            if (weights) this.meshes[i].weights = weights;\r\n            this.meshes[i].render(cgl, ignoreMat, skinRenderer, _time);\r\n            if (skinRenderer)skinRenderer.renderFinish(cgl);\r\n            if (!ignoreMat && useMat) cgl.popShader();\r\n        }\r\n    }\r\n};\r\n","inc_node_js":"const gltfNode = class\r\n{\r\n    constructor(node, gltf)\r\n    {\r\n        this.isChild = node.isChild || false;\r\n        node.name = node.name || \"unknown node \" + CABLES.simpleId();\r\n        this.name = node.name;\r\n        if (node.hasOwnProperty(\"camera\")) this.camera = node.camera;\r\n        this.hidden = false;\r\n        this.mat = mat4.create();\r\n        this._animActions = {};\r\n        this.animWeights = [];\r\n        this._animMat = mat4.create();\r\n        this._tempMat = mat4.create();\r\n        this._tempQuat = quat.create();\r\n        this._tempRotmat = mat4.create();\r\n        this.mesh = null;\r\n        this.children = [];\r\n        this._node = node;\r\n        this._gltf = gltf;\r\n        this.absMat = mat4.create();\r\n        this.addTranslate = null;\r\n        this._tempAnimScale = null;\r\n        this.addMulMat = null;\r\n        this.updateMatrix();\r\n        this.skinRenderer = null;\r\n        this.copies = [];\r\n    }\r\n\r\n    get skin()\r\n    {\r\n        if (this._node.hasOwnProperty(\"skin\")) return this._node.skin;\r\n        else return -1;\r\n    }\r\n\r\n    copy()\r\n    {\r\n        this.isCopy = true;\r\n        const n = new gltfNode(this._node, this._gltf);\r\n        n.copyOf = this;\r\n\r\n        n._animActions = this._animActions;\r\n        n.children = this.children;\r\n        if (this.skin) n.skinRenderer = new GltfSkin(this);\r\n\r\n        this.updateMatrix();\r\n        return n;\r\n    }\r\n\r\n    hasSkin()\r\n    {\r\n        if (this._node.hasOwnProperty(\"skin\")) return this._gltf.json.skins[this._node.skin].name || \"unknown\";\r\n        return false;\r\n    }\r\n\r\n    initSkin()\r\n    {\r\n        if (this.skin > -1)\r\n        {\r\n            this.skinRenderer = new GltfSkin(this);\r\n        }\r\n    }\r\n\r\n    updateMatrix()\r\n    {\r\n        mat4.identity(this.mat);\r\n        if (this._node.translation) mat4.translate(this.mat, this.mat, this._node.translation);\r\n\r\n        if (this._node.rotation)\r\n        {\r\n            const rotmat = mat4.create();\r\n            this._rot = this._node.rotation;\r\n\r\n            mat4.fromQuat(rotmat, this._node.rotation);\r\n            mat4.mul(this.mat, this.mat, rotmat);\r\n        }\r\n\r\n        if (this._node.scale)\r\n        {\r\n            this._scale = this._node.scale;\r\n            mat4.scale(this.mat, this.mat, this._scale);\r\n        }\r\n\r\n        if (this._node.hasOwnProperty(\"mesh\"))\r\n        {\r\n            this.mesh = this._gltf.meshes[this._node.mesh];\r\n            if (this.isCopy)\r\n            {\r\n            }\r\n        }\r\n\r\n        if (this._node.children)\r\n        {\r\n            for (let i = 0; i < this._node.children.length; i++)\r\n            {\r\n                this._gltf.json.nodes[i].isChild = true;\r\n                if (this._gltf.nodes[this._node.children[i]]) this._gltf.nodes[this._node.children[i]].isChild = true;\r\n                this.children.push(this._node.children[i]);\r\n            }\r\n        }\r\n    }\r\n\r\n    unHide()\r\n    {\r\n        this.hidden = false;\r\n        for (let i = 0; i < this.children.length; i++)\r\n            if (this.children[i].unHide) this.children[i].unHide();\r\n    }\r\n\r\n    calcBounds(gltf, mat, bounds)\r\n    {\r\n        const localMat = mat4.create();\r\n\r\n        if (mat) mat4.copy(localMat, mat);\r\n        if (this.mat) mat4.mul(localMat, localMat, this.mat);\r\n\r\n        if (this.mesh)\r\n        {\r\n            const bb = this.mesh.bounds.copy();\r\n            bb.mulMat4(localMat);\r\n            bounds.apply(bb);\r\n\r\n            if (bounds.changed)\r\n            {\r\n                boundingPoints.push(\r\n                    bb._min[0] || 0, bb._min[1] || 0, bb._min[2] || 0,\r\n                    bb._max[0] || 0, bb._max[1] || 0, bb._max[2] || 0);\r\n            }\r\n        }\r\n\r\n        for (let i = 0; i < this.children.length; i++)\r\n        {\r\n            if (gltf.nodes[this.children[i]] && gltf.nodes[this.children[i]].calcBounds)\r\n            {\r\n                const b = gltf.nodes[this.children[i]].calcBounds(gltf, localMat, bounds);\r\n\r\n                bounds.apply(b);\r\n            }\r\n        }\r\n\r\n        if (bounds.changed) return bounds;\r\n        else return null;\r\n    }\r\n\r\n    setAnimAction(name)\r\n    {\r\n        if (!name) return;\r\n\r\n        this._currentAnimaction = name;\r\n\r\n        if (name && !this._animActions[name]) return null;\r\n\r\n        for (let path in this._animActions[name])\r\n        {\r\n            if (path == \"translation\") this._animTrans = this._animActions[name][path];\r\n            else if (path == \"rotation\") this._animRot = this._animActions[name][path];\r\n            else if (path == \"scale\") this._animScale = this._animActions[name][path];\r\n            else if (path == \"weights\") this.animWeights = this._animActions[name][path];\r\n        }\r\n    }\r\n\r\n    setAnim(path, name, anims)\r\n    {\r\n        if (!path || !name || !anims) return;\r\n\r\n        this._animActions[name] = this._animActions[name] || {};\r\n\r\n        // debugger;\r\n\r\n        // for (let i = 0; i < this.copies.length; i++) this.copies[i]._animActions = this._animActions;\r\n\r\n        if (this._animActions[name][path]) op.log(\"[gltfNode] animation action path already exists\", name, path, this._animActions[name][path]);\r\n\r\n        this._animActions[name][path] = anims;\r\n\r\n        if (path == \"translation\") this._animTrans = anims;\r\n        else if (path == \"rotation\") this._animRot = anims;\r\n        else if (path == \"scale\") this._animScale = anims;\r\n        else if (path == \"weights\") this.animWeights = this._animActions[name][path];\r\n    }\r\n\r\n    modelMatLocal()\r\n    {\r\n        return this._animMat || this.mat;\r\n    }\r\n\r\n    modelMatAbs()\r\n    {\r\n        return this.absMat;\r\n    }\r\n\r\n    transform(cgl, _time)\r\n    {\r\n        if (!_time && _time != 0)_time = time;\r\n\r\n        this._lastTimeTrans = _time;\r\n\r\n        gltfTransforms++;\r\n\r\n        if (!this._animTrans && !this._animRot && !this._animScale)\r\n        {\r\n            mat4.mul(cgl.mMatrix, cgl.mMatrix, this.mat);\r\n            this._animMat = null;\r\n        }\r\n        else\r\n        {\r\n            this._animMat = this._animMat || mat4.create();\r\n            mat4.identity(this._animMat);\r\n\r\n            const playAnims = true;\r\n\r\n            if (playAnims && this._animTrans)\r\n            {\r\n                mat4.translate(this._animMat, this._animMat, [\r\n                    this._animTrans[0].getValue(_time),\r\n                    this._animTrans[1].getValue(_time),\r\n                    this._animTrans[2].getValue(_time)]);\r\n            }\r\n            else\r\n            if (this._node.translation) mat4.translate(this._animMat, this._animMat, this._node.translation);\r\n\r\n            if (playAnims && this._animRot)\r\n            {\r\n                if (this._animRot[0].defaultEasing == CABLES.EASING_LINEAR) CABLES.Anim.slerpQuaternion(_time, this._tempQuat, this._animRot[0], this._animRot[1], this._animRot[2], this._animRot[3]);\r\n                else if (this._animRot[0].defaultEasing == CABLES.EASING_ABSOLUTE)\r\n                {\r\n                    this._tempQuat[0] = this._animRot[0].getValue(_time);\r\n                    this._tempQuat[1] = this._animRot[1].getValue(_time);\r\n                    this._tempQuat[2] = this._animRot[2].getValue(_time);\r\n                    this._tempQuat[3] = this._animRot[3].getValue(_time);\r\n                }\r\n                else if (this._animRot[0].defaultEasing == CABLES.EASING_CUBICSPLINE)\r\n                {\r\n                    CABLES.Anim.slerpQuaternion(_time, this._tempQuat, this._animRot[0], this._animRot[1], this._animRot[2], this._animRot[3]);\r\n                }\r\n\r\n                mat4.fromQuat(this._tempMat, this._tempQuat);\r\n                mat4.mul(this._animMat, this._animMat, this._tempMat);\r\n            }\r\n            else if (this._rot)\r\n            {\r\n                mat4.fromQuat(this._tempRotmat, this._rot);\r\n                mat4.mul(this._animMat, this._animMat, this._tempRotmat);\r\n            }\r\n\r\n            if (playAnims && this._animScale)\r\n            {\r\n                if (!this._tempAnimScale) this._tempAnimScale = [1, 1, 1];\r\n                this._tempAnimScale[0] = this._animScale[0].getValue(_time);\r\n                this._tempAnimScale[1] = this._animScale[1].getValue(_time);\r\n                this._tempAnimScale[2] = this._animScale[2].getValue(_time);\r\n                mat4.scale(this._animMat, this._animMat, this._tempAnimScale);\r\n            }\r\n            else if (this._scale) mat4.scale(this._animMat, this._animMat, this._scale);\r\n\r\n            mat4.mul(cgl.mMatrix, cgl.mMatrix, this._animMat);\r\n        }\r\n\r\n        if (this.animWeights)\r\n        {\r\n            this.weights = this.weights || [];\r\n\r\n            let str = \"\";\r\n            for (let i = 0; i < this.animWeights.length; i++)\r\n            {\r\n                this.weights[i] = this.animWeights[i].getValue(_time);\r\n                str += this.weights[i] + \"/\";\r\n            }\r\n\r\n            // this.mesh.weights=this.animWeights.get(_time);\r\n        }\r\n\r\n        if (this.addTranslate) mat4.translate(cgl.mMatrix, cgl.mMatrix, this.addTranslate);\r\n\r\n        if (this.addMulMat) mat4.mul(cgl.mMatrix, cgl.mMatrix, this.addMulMat);\r\n\r\n        mat4.copy(this.absMat, cgl.mMatrix);\r\n    }\r\n\r\n    render(cgl, dontTransform, dontDrawMesh, ignoreMaterial, ignoreChilds, drawHidden, _time)\r\n    {\r\n        if (!dontTransform) cgl.pushModelMatrix();\r\n\r\n        if (_time === undefined) _time = gltf.time;\r\n\r\n        if (!dontTransform || this.skinRenderer) this.transform(cgl, _time);\r\n\r\n        if (this.hidden && !drawHidden)\r\n        {\r\n        }\r\n        else\r\n        {\r\n            if (this.skinRenderer)\r\n            {\r\n                this.skinRenderer.time = _time;\r\n                if (!dontDrawMesh)\r\n                    this.mesh.render(cgl, ignoreMaterial, this.skinRenderer, _time, this.weights);\r\n            }\r\n            else\r\n            {\r\n                if (this.mesh && !dontDrawMesh)\r\n                    this.mesh.render(cgl, ignoreMaterial, null, _time, this.weights);\r\n            }\r\n        }\r\n\r\n        if (!ignoreChilds && !this.hidden)\r\n            for (let i = 0; i < this.children.length; i++)\r\n                if (gltf.nodes[this.children[i]])\r\n                    gltf.nodes[this.children[i]].render(cgl, dontTransform, dontDrawMesh, ignoreMaterial, ignoreChilds, drawHidden, _time);\r\n\r\n        if (!dontTransform)cgl.popModelMatrix();\r\n    }\r\n};\r\n","inc_print_js":"let tab = null;\r\n\r\nfunction closeTab()\r\n{\r\n    if (tab)gui.mainTabs.closeTab(tab.id);\r\n    tab = null;\r\n}\r\n\r\nfunction formatVec(arr)\r\n{\r\n    const nums = [];\r\n    for (let i = 0; i < arr.length; i++)\r\n    {\r\n        nums.push(Math.round(arr[i] * 1000) / 1000);\r\n    }\r\n\r\n    return nums.join(\",\");\r\n}\r\n\r\nfunction printNode(html, node, level)\r\n{\r\n    if (!gltf) return;\r\n\r\n    html += \"<tr class=\\\"row\\\">\";\r\n\r\n    let ident = \"\";\r\n    let identSpace = \"\";\r\n\r\n    for (let i = 1; i < level; i++)\r\n    {\r\n        identSpace += \"&nbsp;&nbsp;&nbsp;\";\r\n        let identClass = \"identBg\";\r\n        if (i == 1)identClass = \"identBgLevel0\";\r\n        ident += \"<td class=\\\"ident \" + identClass + \"\\\" ><div style=\\\"\\\"></div></td>\";\r\n    }\r\n    let id = CABLES.uuid();\r\n    html += ident;\r\n    html += \"<td colspan=\\\"\" + (21 - level) + \"\\\">\";\r\n\r\n    if (node.mesh && node.mesh.meshes.length)html += \"<span class=\\\"icon icon-cube\\\"></span>&nbsp;\";\r\n    else html += \"<span class=\\\"icon icon-box-select\\\"></span> &nbsp;\";\r\n\r\n    html += node.name + \"</td><td></td>\";\r\n\r\n    if (node.mesh)\r\n    {\r\n        html += \"<td>\";\r\n        for (let i = 0; i < node.mesh.meshes.length; i++)\r\n        {\r\n            if (i > 0)html += \", \";\r\n            html += node.mesh.meshes[i].name;\r\n        }\r\n\r\n        html += \"</td>\";\r\n\r\n        html += \"<td>\";\r\n        html += node.hasSkin() || \"-\";\r\n        html += \"</td>\";\r\n\r\n        html += \"<td>\";\r\n        let countMats = 0;\r\n        for (let i = 0; i < node.mesh.meshes.length; i++)\r\n        {\r\n            if (countMats > 0)html += \", \";\r\n            if (gltf.json.materials && node.mesh.meshes[i].hasOwnProperty(\"material\"))\r\n            {\r\n                if (gltf.json.materials[node.mesh.meshes[i].material])\r\n                {\r\n                    html += gltf.json.materials[node.mesh.meshes[i].material].name;\r\n                    countMats++;\r\n                }\r\n            }\r\n        }\r\n        if (countMats == 0)html += \"none\";\r\n        html += \"</td>\";\r\n    }\r\n    else\r\n    {\r\n        html += \"<td>-</td><td>-</td><td>-</td>\";\r\n    }\r\n\r\n    html += \"<td>\";\r\n\r\n    if (node._node.translation || node._node.rotation || node._node.scale)\r\n    {\r\n        let info = \"\";\r\n\r\n        if (node._node.translation)info += \"Translate: `\" + formatVec(node._node.translation) + \"` || \";\r\n        if (node._node.rotation)info += \"Rotation: `\" + formatVec(node._node.rotation) + \"` || \";\r\n        if (node._node.scale)info += \"Scale: `\" + formatVec(node._node.scale) + \"` || \";\r\n\r\n        html += \"<span class=\\\"icon icon-gizmo info\\\" data-info=\\\"\" + info + \"\\\"></span> &nbsp;\";\r\n    }\r\n\r\n    if (node._animRot || node._animScale || node._animTrans)\r\n    {\r\n        let info = \"Animated: \";\r\n        if (node._animRot) info += \"Rot \";\r\n        if (node._animScale) info += \"Scale \";\r\n        if (node._animTrans) info += \"Trans \";\r\n\r\n        html += \"<span class=\\\"icon icon-clock info\\\" data-info=\\\"\" + info + \"\\\"></span>&nbsp;\";\r\n    }\r\n\r\n    if (!node._node.translation && !node._node.rotation && !node._node.scale && !node._animRot && !node._animScale && !node._animTrans) html += \"-\";\r\n\r\n    html += \"</td>\";\r\n\r\n    html += \"<td>\";\r\n    let hideclass = \"\";\r\n    if (node.hidden)hideclass = \"node-hidden\";\r\n\r\n    // html+='';\r\n    html += \"<a onclick=\\\"gui.corePatch().getOpById('\" + op.id + \"').exposeNode('\" + node.name + \"','transform')\\\" class=\\\"treebutton\\\">Transform</a>\";\r\n    html += \" <a onclick=\\\"gui.corePatch().getOpById('\" + op.id + \"').exposeNode('\" + node.name + \"','hierarchy')\\\" class=\\\"treebutton\\\">Hierarchy</a>\";\r\n    html += \" <a onclick=\\\"gui.corePatch().getOpById('\" + op.id + \"').exposeNode('\" + node.name + \"')\\\" class=\\\"treebutton\\\">Node</a>\";\r\n\r\n    if (node.hasSkin())\r\n        html += \" <a onclick=\\\"gui.corePatch().getOpById('\" + op.id + \"').exposeNode('\" + node.name + \"',false,{skin:true});\\\" class=\\\"treebutton\\\">Skin</a>\";\r\n\r\n    html += \"</td><td>\";\r\n    html += \"&nbsp;<span class=\\\"icon iconhover icon-eye \" + hideclass + \"\\\" onclick=\\\"gui.corePatch().getOpById('\" + op.id + \"').toggleNodeVisibility('\" + node.name + \"');this.classList.toggle('node-hidden');\\\"></span>\";\r\n    html += \"</td>\";\r\n\r\n    html += \"</tr>\";\r\n\r\n    if (node.children)\r\n    {\r\n        for (let i = 0; i < node.children.length; i++)\r\n            html = printNode(html, gltf.nodes[node.children[i]], level + 1);\r\n    }\r\n\r\n    return html;\r\n}\r\n\r\nfunction printMaterial(mat, idx)\r\n{\r\n    let html = \"<tr>\";\r\n    html += \" <td>\" + idx + \"</td>\";\r\n    html += \" <td>\" + mat.name + \"</td>\";\r\n\r\n    html += \" <td>\";\r\n\r\n    const info = JSON.stringify(mat, null, 4).replaceAll(\"\\\"\", \"\").replaceAll(\"\\n\", \"<br/>\");\r\n\r\n    html += \"<span class=\\\"icon icon-info\\\" onclick=\\\"new CABLES.UI.ModalDialog({ 'html': '<pre>\" + info + \"</pre>', 'title': '\" + mat.name + \"' });\\\"></span>&nbsp;\";\r\n\r\n    if (mat.pbrMetallicRoughness && mat.pbrMetallicRoughness.baseColorFactor)\r\n    {\r\n        let rgb = \"\";\r\n        rgb += \"\" + Math.round(mat.pbrMetallicRoughness.baseColorFactor[0] * 255);\r\n        rgb += \",\" + Math.round(mat.pbrMetallicRoughness.baseColorFactor[1] * 255);\r\n        rgb += \",\" + Math.round(mat.pbrMetallicRoughness.baseColorFactor[2] * 255);\r\n\r\n        html += \"<div style=\\\"width:15px;height:15px;background-color:rgb(\" + rgb + \");display:inline-block\\\">&nbsp;</a>\";\r\n    }\r\n    html += \" <td style=\\\"\\\">\" + (gltf.shaders[idx] ? \"-\" : \"<a onclick=\\\"gui.corePatch().getOpById('\" + op.id + \"').assignMaterial('\" + mat.name + \"')\\\" class=\\\"treebutton\\\">Assign</a>\") + \"<td>\";\r\n    html += \"<td>\";\r\n\r\n    html += \"</tr>\";\r\n    return html;\r\n}\r\n\r\nfunction printInfo()\r\n{\r\n    if (!gltf) return;\r\n\r\n    const startTime = performance.now();\r\n    const sizes = {};\r\n    let html = \"<div style=\\\"overflow:scroll;width:100%;height:100%\\\">\";\r\n\r\n    html += \"File: <a href=\\\"\" + CABLES.platform.getCablesUrl() + \"/asset/patches/?filename=\" + inFile.get() + \"\\\" target=\\\"_blank\\\">\" + CABLES.basename(inFile.get()) + \"</a><br/>\";\r\n\r\n    html += \"Generator:\" + gltf.json.asset.generator;\r\n\r\n    let numNodes = 0;\r\n    if (gltf.json.nodes)numNodes = gltf.json.nodes.length;\r\n    html += \"<div id=\\\"groupNodes\\\">Nodes (\" + numNodes + \")</div>\";\r\n\r\n    html += \"<table id=\\\"sectionNodes\\\" class=\\\"table treetable\\\">\";\r\n\r\n    html += \"<tr>\";\r\n    html += \" <th colspan=\\\"21\\\">Name</th>\";\r\n    html += \" <th>Mesh</th>\";\r\n    html += \" <th>Skin</th>\";\r\n    html += \" <th>Material</th>\";\r\n    html += \" <th>Transform</th>\";\r\n    html += \" <th>Expose</th>\";\r\n    html += \" <th></th>\";\r\n    html += \"</tr>\";\r\n\r\n    for (let i = 0; i < gltf.nodes.length; i++)\r\n    {\r\n        if (!gltf.nodes[i].isChild)\r\n            html = printNode(html, gltf.nodes[i], 1);\r\n    }\r\n    html += \"</table>\";\r\n\r\n    // / //////////////////\r\n\r\n    let numMaterials = 0;\r\n    if (gltf.json.materials)numMaterials = gltf.json.materials.length;\r\n    html += \"<div id=\\\"groupMaterials\\\">Materials (\" + numMaterials + \")</div>\";\r\n\r\n    if (!gltf.json.materials || gltf.json.materials.length == 0)\r\n    {\r\n    }\r\n    else\r\n    {\r\n        html += \"<table id=\\\"materialtable\\\"  class=\\\"table treetable\\\">\";\r\n        html += \"<tr>\";\r\n        html += \" <th>Index</th>\";\r\n        html += \" <th>Name</th>\";\r\n        html += \" <th>Color</th>\";\r\n        html += \" <th>Function</th>\";\r\n        html += \" <th></th>\";\r\n        html += \"</tr>\";\r\n        for (let i = 0; i < gltf.json.materials.length; i++)\r\n        {\r\n            html += printMaterial(gltf.json.materials[i], i);\r\n        }\r\n        html += \"</table>\";\r\n    }\r\n\r\n    // / ///////////////////////\r\n\r\n    html += \"<div id=\\\"groupMeshes\\\">Meshes (\" + gltf.json.meshes.length + \")</div>\";\r\n\r\n    html += \"<table id=\\\"meshestable\\\"  class=\\\"table treetable\\\">\";\r\n    html += \"<tr>\";\r\n    html += \" <th>Name</th>\";\r\n    html += \" <th>Node</th>\";\r\n    html += \" <th>Material</th>\";\r\n    html += \" <th>Vertices</th>\";\r\n    html += \" <th>Attributes</th>\";\r\n    html += \"</tr>\";\r\n\r\n    let sizeBufferViews = [];\r\n    sizes.meshes = 0;\r\n    sizes.meshTargets = 0;\r\n\r\n    for (let i = 0; i < gltf.json.meshes.length; i++)\r\n    {\r\n        html += \"<tr>\";\r\n        html += \"<td>\" + gltf.json.meshes[i].name + \"</td>\";\r\n\r\n        html += \"<td>\";\r\n        let count = 0;\r\n        let nodename = \"\";\r\n        if (gltf.json.nodes)\r\n            for (let j = 0; j < gltf.json.nodes.length; j++)\r\n            {\r\n                if (gltf.json.nodes[j].mesh == i)\r\n                {\r\n                    count++;\r\n                    if (count == 1)\r\n                    {\r\n                        nodename = gltf.json.nodes[j].name;\r\n                    }\r\n                }\r\n            }\r\n        if (count > 1) html += (count) + \" nodes (\" + nodename + \" ...)\";\r\n        else html += nodename;\r\n        html += \"</td>\";\r\n\r\n        // -------\r\n\r\n        html += \"<td>\";\r\n        for (let j = 0; j < gltf.json.meshes[i].primitives.length; j++)\r\n        {\r\n            if (gltf.json.meshes[i].primitives[j].hasOwnProperty(\"material\"))\r\n            {\r\n                if (gltf.json.materials[gltf.json.meshes[i]])\r\n                {\r\n                    html += gltf.json.materials[gltf.json.meshes[i].primitives[j].material].name + \" \";\r\n                }\r\n            }\r\n            else html += \"None\";\r\n        }\r\n        html += \"</td>\";\r\n\r\n        html += \"<td>\";\r\n        let numVerts = 0;\r\n        for (let j = 0; j < gltf.json.meshes[i].primitives.length; j++)\r\n        {\r\n            if (gltf.json.meshes[i].primitives[j].attributes.POSITION != undefined)\r\n            {\r\n                let v = parseInt(gltf.json.accessors[gltf.json.meshes[i].primitives[j].attributes.POSITION].count);\r\n                numVerts += v;\r\n                html += \"\" + v + \"<br/>\";\r\n            }\r\n            else html += \"-<br/>\";\r\n        }\r\n\r\n        if (gltf.json.meshes[i].primitives.length > 1)\r\n            html += \"=\" + numVerts;\r\n        html += \"</td>\";\r\n\r\n        html += \"<td>\";\r\n        for (let j = 0; j < gltf.json.meshes[i].primitives.length; j++)\r\n        {\r\n            html += Object.keys(gltf.json.meshes[i].primitives[j].attributes);\r\n            html += \" <a onclick=\\\"gui.corePatch().getOpById('\" + op.id + \"').exposeGeom('\" + gltf.json.meshes[i].name + \"',\" + j + \")\\\" class=\\\"treebutton\\\">Geometry</a>\";\r\n            html += \"<br/>\";\r\n\r\n            if (gltf.json.meshes[i].primitives[j].targets)\r\n            {\r\n                html += gltf.json.meshes[i].primitives[j].targets.length + \" targets<br/>\";\r\n\r\n                if (gltf.json.meshes[i].extras && gltf.json.meshes[i].extras.targetNames)\r\n                    html += \"Targetnames:<br/>\" + gltf.json.meshes[i].extras.targetNames.join(\"<br/>\");\r\n\r\n                html += \"<br/>\";\r\n            }\r\n        }\r\n\r\n        html += \"</td>\";\r\n        html += \"</tr>\";\r\n\r\n        for (let j = 0; j < gltf.json.meshes[i].primitives.length; j++)\r\n        {\r\n            const accessor = gltf.json.accessors[gltf.json.meshes[i].primitives[j].indices];\r\n            if (accessor)\r\n            {\r\n                let bufView = accessor.bufferView;\r\n\r\n                if (sizeBufferViews.indexOf(bufView) == -1)\r\n                {\r\n                    sizeBufferViews.push(bufView);\r\n                    if (gltf.json.bufferViews[bufView])sizes.meshes += gltf.json.bufferViews[bufView].byteLength;\r\n                }\r\n            }\r\n\r\n            for (let k in gltf.json.meshes[i].primitives[j].attributes)\r\n            {\r\n                const attr = gltf.json.meshes[i].primitives[j].attributes[k];\r\n                const bufView2 = gltf.json.accessors[attr].bufferView;\r\n\r\n                if (sizeBufferViews.indexOf(bufView2) == -1)\r\n                {\r\n                    sizeBufferViews.push(bufView2);\r\n                    if (gltf.json.bufferViews[bufView2])sizes.meshes += gltf.json.bufferViews[bufView2].byteLength;\r\n                }\r\n            }\r\n\r\n            if (gltf.json.meshes[i].primitives[j].targets)\r\n                for (let k = 0; k < gltf.json.meshes[i].primitives[j].targets.length; k++)\r\n                {\r\n                    for (let l in gltf.json.meshes[i].primitives[j].targets[k])\r\n                    {\r\n                        const accessorIdx = gltf.json.meshes[i].primitives[j].targets[k][l];\r\n                        const accessor = gltf.json.accessors[accessorIdx];\r\n                        const bufView2 = accessor.bufferView;\r\n                        console.log(\"accessor\", accessor);\r\n                        if (sizeBufferViews.indexOf(bufView2) == -1)\r\n                            if (gltf.json.bufferViews[bufView2])\r\n                            {\r\n                                sizeBufferViews.push(bufView2);\r\n                                sizes.meshTargets += gltf.json.bufferViews[bufView2].byteLength;\r\n                            }\r\n                    }\r\n                }\r\n        }\r\n    }\r\n    html += \"</table>\";\r\n\r\n    // / //////////////////////////////////\r\n\r\n    let numSamplers = 0;\r\n    let numAnims = 0;\r\n    let numKeyframes = 0;\r\n\r\n    if (gltf.json.animations)\r\n    {\r\n        numAnims = gltf.json.animations.length;\r\n        for (let i = 0; i < gltf.json.animations.length; i++)\r\n        {\r\n            numSamplers += gltf.json.animations[i].samplers.length;\r\n        }\r\n    }\r\n\r\n    html += \"<div id=\\\"groupAnims\\\">Animations (\" + numAnims + \"/\" + numSamplers + \")</div>\";\r\n\r\n    if (gltf.json.animations)\r\n    {\r\n        html += \"<table id=\\\"sectionAnim\\\" class=\\\"table treetable\\\">\";\r\n        html += \"<tr>\";\r\n        html += \"  <th>Name</th>\";\r\n        html += \"  <th>Target node</th>\";\r\n        html += \"  <th>Path</th>\";\r\n        html += \"  <th>Interpolation</th>\";\r\n        html += \"  <th>Keys</th>\";\r\n        html += \"</tr>\";\r\n\r\n\r\n        sizes.animations = 0;\r\n\r\n        for (let i = 0; i < gltf.json.animations.length; i++)\r\n        {\r\n            for (let j = 0; j < gltf.json.animations[i].samplers.length; j++)\r\n            {\r\n                let bufView = gltf.json.accessors[gltf.json.animations[i].samplers[j].input].bufferView;\r\n                if (sizeBufferViews.indexOf(bufView) == -1)\r\n                {\r\n                    sizeBufferViews.push(bufView);\r\n                    sizes.animations += gltf.json.bufferViews[bufView].byteLength;\r\n                }\r\n\r\n                bufView = gltf.json.accessors[gltf.json.animations[i].samplers[j].output].bufferView;\r\n                if (sizeBufferViews.indexOf(bufView) == -1)\r\n                {\r\n                    sizeBufferViews.push(bufView);\r\n                    sizes.animations += gltf.json.bufferViews[bufView].byteLength;\r\n                }\r\n            }\r\n\r\n            for (let j = 0; j < gltf.json.animations[i].channels.length; j++)\r\n            {\r\n                html += \"<tr>\";\r\n                html += \"  <td> Anim \" + i + \": \" + gltf.json.animations[i].name + \"</td>\";\r\n\r\n                html += \"  <td>\" + gltf.nodes[gltf.json.animations[i].channels[j].target.node].name + \"</td>\";\r\n                html += \"  <td>\";\r\n                html += gltf.json.animations[i].channels[j].target.path + \" \";\r\n                html += \"  </td>\";\r\n\r\n                const smplidx = gltf.json.animations[i].channels[j].sampler;\r\n                const smplr = gltf.json.animations[i].samplers[smplidx];\r\n\r\n                html += \"  <td>\" + smplr.interpolation + \"</td>\";\r\n\r\n                html += \"  <td>\" + gltf.json.accessors[smplr.output].count;\r\n                numKeyframes += gltf.json.accessors[smplr.output].count;\r\n\r\n                // html += \"&nbsp;&nbsp;<a onclick=\\\"gui.corePatch().getOpById('\" + op.id + \"').showAnim('\" + i + \"','\" + j + \"')\\\" class=\\\"icon icon-search\\\"></a>\";\r\n\r\n                html += \"</td>\";\r\n\r\n                html += \"</tr>\";\r\n            }\r\n        }\r\n\r\n        html += \"<tr>\";\r\n        html += \"  <td></td>\";\r\n        html += \"  <td></td>\";\r\n        html += \"  <td></td>\";\r\n        html += \"  <td></td>\";\r\n        html += \"  <td>\" + numKeyframes + \" total</td>\";\r\n        html += \"</tr>\";\r\n        html += \"</table>\";\r\n    }\r\n    else\r\n    {\r\n\r\n    }\r\n\r\n    // / ///////////////////\r\n\r\n    let numImages = 0;\r\n    if (gltf.json.images)numImages = gltf.json.images.length;\r\n    html += \"<div id=\\\"groupImages\\\">Images (\" + numImages + \")</div>\";\r\n\r\n    if (gltf.json.images)\r\n    {\r\n        html += \"<table id=\\\"sectionImages\\\" class=\\\"table treetable\\\">\";\r\n\r\n        html += \"<tr>\";\r\n        html += \"  <th>name</th>\";\r\n        html += \"  <th>type</th>\";\r\n        html += \"  <th>func</th>\";\r\n        html += \"</tr>\";\r\n\r\n        sizes.images = 0;\r\n\r\n        for (let i = 0; i < gltf.json.images.length; i++)\r\n        {\r\n            if (gltf.json.images[i].hasOwnProperty(\"bufferView\"))\r\n            {\r\n                // if (sizeBufferViews.indexOf(gltf.json.images[i].hasOwnProperty(\"bufferView\")) == -1)console.log(\"image bufferview already there?!\");\r\n                // else\r\n                sizes.images += gltf.json.bufferViews[gltf.json.images[i].bufferView].byteLength;\r\n            }\r\n            else console.log(\"image has no bufferview?!\");\r\n\r\n            html += \"<tr>\";\r\n            html += \"<td>\" + gltf.json.images[i].name + \"</td>\";\r\n            html += \"<td>\" + gltf.json.images[i].mimeType + \"</td>\";\r\n            html += \"<td>\";\r\n\r\n            let name = gltf.json.images[i].name;\r\n            if (name === undefined)name = gltf.json.images[i].bufferView;\r\n\r\n            html += \"<a onclick=\\\"gui.corePatch().getOpById('\" + op.id + \"').exposeTexture('\" + name + \"')\\\" class=\\\"treebutton\\\">Expose</a>\";\r\n            html += \"</td>\";\r\n\r\n            html += \"<tr>\";\r\n        }\r\n        html += \"</table>\";\r\n    }\r\n\r\n    // / ///////////////////////\r\n\r\n    let numCameras = 0;\r\n    if (gltf.json.cameras)numCameras = gltf.json.cameras.length;\r\n    html += \"<div id=\\\"groupCameras\\\">Cameras (\" + numCameras + \")</div>\";\r\n\r\n    if (gltf.json.cameras)\r\n    {\r\n        html += \"<table id=\\\"sectionCameras\\\" class=\\\"table treetable\\\">\";\r\n\r\n        html += \"<tr>\";\r\n        html += \"  <th>name</th>\";\r\n        html += \"  <th>type</th>\";\r\n        html += \"  <th>info</th>\";\r\n        html += \"</tr>\";\r\n\r\n        for (let i = 0; i < gltf.json.cameras.length; i++)\r\n        {\r\n            html += \"<tr>\";\r\n            html += \"<td>\" + gltf.json.cameras[i].name + \"</td>\";\r\n            html += \"<td>\" + gltf.json.cameras[i].type + \"</td>\";\r\n            html += \"<td>\";\r\n\r\n            if (gltf.json.cameras[i].perspective)\r\n            {\r\n                html += \"yfov: \" + Math.round(gltf.json.cameras[i].perspective.yfov * 100) / 100;\r\n                html += \", \";\r\n                html += \"zfar: \" + Math.round(gltf.json.cameras[i].perspective.zfar * 100) / 100;\r\n                html += \", \";\r\n                html += \"znear: \" + Math.round(gltf.json.cameras[i].perspective.znear * 100) / 100;\r\n            }\r\n            html += \"</td>\";\r\n\r\n            html += \"<tr>\";\r\n        }\r\n        html += \"</table>\";\r\n    }\r\n\r\n    // / ////////////////////////////////////\r\n\r\n    let numSkins = 0;\r\n    if (gltf.json.skins)numSkins = gltf.json.skins.length;\r\n    html += \"<div id=\\\"groupSkins\\\">Skins (\" + numSkins + \")</div>\";\r\n\r\n    if (gltf.json.skins)\r\n    {\r\n        // html += \"<h3>Skins (\" + gltf.json.skins.length + \")</h3>\";\r\n        html += \"<table id=\\\"sectionSkins\\\" class=\\\"table treetable\\\">\";\r\n\r\n        html += \"<tr>\";\r\n        html += \"  <th>name</th>\";\r\n        html += \"  <th></th>\";\r\n        html += \"  <th>total joints</th>\";\r\n        html += \"</tr>\";\r\n\r\n        for (let i = 0; i < gltf.json.skins.length; i++)\r\n        {\r\n            html += \"<tr>\";\r\n            html += \"<td>\" + gltf.json.skins[i].name + \"</td>\";\r\n            html += \"<td>\" + \"</td>\";\r\n            html += \"<td>\" + gltf.json.skins[i].joints.length + \"</td>\";\r\n            html += \"<td>\";\r\n            html += \"</td>\";\r\n            html += \"<tr>\";\r\n        }\r\n        html += \"</table>\";\r\n    }\r\n\r\n    // / ////////////////////////////////////\r\n\r\n    if (gltf.timing)\r\n    {\r\n        html += \"<div id=\\\"groupTiming\\\">Debug Loading Timing </div>\";\r\n\r\n        html += \"<table id=\\\"sectionTiming\\\" class=\\\"table treetable\\\">\";\r\n\r\n        html += \"<tr>\";\r\n        html += \"  <th>task</th>\";\r\n        html += \"  <th>time used</th>\";\r\n        html += \"</tr>\";\r\n\r\n        let lt = 0;\r\n        for (let i = 0; i < gltf.timing.length - 1; i++)\r\n        {\r\n            html += \"<tr>\";\r\n            html += \"  <td>\" + gltf.timing[i][0] + \"</td>\";\r\n            html += \"  <td>\" + (gltf.timing[i + 1][1] - gltf.timing[i][1]) + \" ms</td>\";\r\n            html += \"</tr>\";\r\n            // lt = gltf.timing[i][1];\r\n        }\r\n        html += \"</table>\";\r\n    }\r\n\r\n    // / //////////////////////////\r\n\r\n    let sizeBin = 0;\r\n    if (gltf.json.buffers)\r\n        sizeBin = gltf.json.buffers[0].byteLength;\r\n\r\n    html += \"<div id=\\\"groupBinary\\\">File Size Allocation (\" + Math.round(sizeBin / 1024) + \"k )</div>\";\r\n\r\n    html += \"<table id=\\\"sectionBinary\\\" class=\\\"table treetable\\\">\";\r\n    html += \"<tr>\";\r\n    html += \"  <th>name</th>\";\r\n    html += \"  <th>size</th>\";\r\n    html += \"  <th>%</th>\";\r\n    html += \"</tr>\";\r\n    let sizeUnknown = sizeBin;\r\n    for (let i in sizes)\r\n    {\r\n        // html+=i+':'+Math.round(sizes[i]/1024);\r\n        html += \"<tr>\";\r\n        html += \"<td>\" + i + \"</td>\";\r\n        html += \"<td>\" + readableSize(sizes[i]) + \" </td>\";\r\n        html += \"<td>\" + Math.round(sizes[i] / sizeBin * 100) + \"% </td>\";\r\n        html += \"<tr>\";\r\n        sizeUnknown -= sizes[i];\r\n    }\r\n\r\n    if (sizeUnknown != 0)\r\n    {\r\n        html += \"<tr>\";\r\n        html += \"<td>unknown</td>\";\r\n        html += \"<td>\" + readableSize(sizeUnknown) + \" </td>\";\r\n        html += \"<td>\" + Math.round(sizeUnknown / sizeBin * 100) + \"% </td>\";\r\n        html += \"<tr>\";\r\n    }\r\n\r\n    html += \"</table>\";\r\n    html += \"</div>\";\r\n\r\n    tab = new CABLES.UI.Tab(\"GLTF \" + CABLES.basename(inFile.get()), { \"icon\": \"cube\", \"infotext\": \"tab_gltf\", \"padding\": true, \"singleton\": true });\r\n    gui.mainTabs.addTab(tab, true);\r\n\r\n    tab.addEventListener(\"close\", closeTab);\r\n    tab.html(html);\r\n\r\n    CABLES.UI.Collapsable.setup(ele.byId(\"groupNodes\"), ele.byId(\"sectionNodes\"), false);\r\n    CABLES.UI.Collapsable.setup(ele.byId(\"groupMaterials\"), ele.byId(\"materialtable\"), true);\r\n    CABLES.UI.Collapsable.setup(ele.byId(\"groupAnims\"), ele.byId(\"sectionAnim\"), true);\r\n    CABLES.UI.Collapsable.setup(ele.byId(\"groupMeshes\"), ele.byId(\"meshestable\"), true);\r\n    CABLES.UI.Collapsable.setup(ele.byId(\"groupCameras\"), ele.byId(\"sectionCameras\"), true);\r\n    CABLES.UI.Collapsable.setup(ele.byId(\"groupImages\"), ele.byId(\"sectionImages\"), true);\r\n    CABLES.UI.Collapsable.setup(ele.byId(\"groupSkins\"), ele.byId(\"sectionSkins\"), true);\r\n    CABLES.UI.Collapsable.setup(ele.byId(\"groupBinary\"), ele.byId(\"sectionBinary\"), true);\r\n    CABLES.UI.Collapsable.setup(ele.byId(\"groupTiming\"), ele.byId(\"sectionTiming\"), true);\r\n\r\n    gui.maintabPanel.show(true);\r\n}\r\n\r\nfunction readableSize(n)\r\n{\r\n    if (n > 1024) return Math.round(n / 1024) + \" kb\";\r\n    if (n > 1024 * 500) return Math.round(n / 1024) + \" mb\";\r\n    else return n + \" bytes\";\r\n}\r\n","inc_skin_js":"const GltfSkin = class\r\n{\r\n    constructor(node)\r\n    {\r\n        this._mod = null;\r\n        this._node = node;\r\n        this._lastTime = 0;\r\n        this._matArr = [];\r\n        this._m = mat4.create();\r\n        this._invBindMatrix = mat4.create();\r\n        this.identity = true;\r\n    }\r\n\r\n    renderFinish(cgl)\r\n    {\r\n        cgl.popModelMatrix();\r\n        this._mod.unbind();\r\n    }\r\n\r\n    renderStart(cgl, time)\r\n    {\r\n        if (!this._mod)\r\n        {\r\n            this._mod = new CGL.ShaderModifier(cgl, op.name + this._node.name);\r\n\r\n            this._mod.addModule({\r\n                \"priority\": -2,\r\n                \"name\": \"MODULE_VERTEX_POSITION\",\r\n                \"srcHeadVert\": attachments.skin_head_vert || \"\",\r\n                \"srcBodyVert\": attachments.skin_vert || \"\"\r\n            });\r\n\r\n            this._mod.addUniformVert(\"m4[]\", \"MOD_boneMats\", []);// bohnenmatze\r\n            const tr = vec3.create();\r\n        }\r\n\r\n        const skinIdx = this._node.skin;\r\n        const arrLength = gltf.json.skins[skinIdx].joints.length * 16;\r\n\r\n        // if (this._lastTime != time || !time)\r\n        {\r\n            // this._lastTime=inTime.get();\r\n            if (this._matArr.length != arrLength) this._matArr.length = arrLength;\r\n\r\n            for (let i = 0; i < gltf.json.skins[skinIdx].joints.length; i++)\r\n            {\r\n                const i16 = i * 16;\r\n                const jointIdx = gltf.json.skins[skinIdx].joints[i];\r\n                const nodeJoint = gltf.nodes[jointIdx];\r\n\r\n                for (let j = 0; j < 16; j++)\r\n                    this._invBindMatrix[j] = gltf.accBuffers[gltf.json.skins[skinIdx].inverseBindMatrices][i16 + j];\r\n\r\n                mat4.mul(this._m, nodeJoint.modelMatAbs(), this._invBindMatrix);\r\n\r\n                for (let j = 0; j < this._m.length; j++) this._matArr[i16 + j] = this._m[j];\r\n            }\r\n\r\n            this._mod.setUniformValue(\"MOD_boneMats\", this._matArr);\r\n            this._lastTime = time;\r\n        }\r\n\r\n        this._mod.define(\"SKIN_NUM_BONES\", gltf.json.skins[skinIdx].joints.length);\r\n        this._mod.bind();\r\n\r\n        // draw mesh...\r\n        cgl.pushModelMatrix();\r\n        if (this.identity)mat4.identity(cgl.mMatrix);\r\n    }\r\n};\r\n","inc_targets_js":"const GltfTargetsRenderer = class\r\n{\r\n    constructor(mesh)\r\n    {\r\n        this.mesh = mesh;\r\n        this.tex = null;\r\n        this.numRowsPerTarget = 0;\r\n\r\n        this.makeTex(mesh.geom);\r\n    }\r\n\r\n    renderFinish(cgl)\r\n    {\r\n        if (!cgl.gl) return;\r\n        cgl.popModelMatrix();\r\n        this._mod.unbind();\r\n    }\r\n\r\n    renderStart(cgl, time)\r\n    {\r\n        if (!cgl.gl) return;\r\n        if (!this._mod)\r\n        {\r\n            this._mod = new CGL.ShaderModifier(cgl, \"gltftarget\");\r\n\r\n            this._mod.addModule({\r\n                \"priority\": -2,\r\n                \"name\": \"MODULE_VERTEX_POSITION\",\r\n                \"srcHeadVert\": attachments.targets_head_vert || \"\",\r\n                \"srcBodyVert\": attachments.targets_vert || \"\"\r\n            });\r\n\r\n            this._mod.addUniformVert(\"4f\", \"MOD_targetTexInfo\", [0, 0, 0, 0]);\r\n            this._mod.addUniformVert(\"t\", \"MOD_targetTex\", 1);\r\n            this._mod.addUniformVert(\"f[]\", \"MOD_weights\", []);\r\n\r\n            const tr = vec3.create();\r\n        }\r\n\r\n        this._mod.pushTexture(\"MOD_targetTex\", this.tex);\r\n        if (this.tex && this.mesh.weights)\r\n        {\r\n            this._mod.setUniformValue(\"MOD_weights\", this.mesh.weights);\r\n            this._mod.setUniformValue(\"MOD_targetTexInfo\", [this.tex.width, this.tex.height, this.numRowsPerTarget, this.mesh.weights.length]);\r\n\r\n            this._mod.define(\"MOD_NUM_WEIGHTS\", Math.max(1, this.mesh.weights.length));\r\n        }\r\n        else\r\n        {\r\n            this._mod.define(\"MOD_NUM_WEIGHTS\", 1);\r\n        }\r\n        this._mod.bind();\r\n\r\n        // draw mesh...\r\n        cgl.pushModelMatrix();\r\n        if (this.identity)mat4.identity(cgl.mMatrix);\r\n    }\r\n\r\n    makeTex(geom)\r\n    {\r\n        if (!cgl.gl) return;\r\n\r\n        if (!geom.morphTargets || !geom.morphTargets.length) return;\r\n\r\n        let w = geom.morphTargets[0].vertices.length / 3;\r\n        let h = 0;\r\n        this.numRowsPerTarget = 0;\r\n\r\n        if (geom.morphTargets[0].vertices && geom.morphTargets[0].vertices.length) this.numRowsPerTarget++;\r\n        if (geom.morphTargets[0].vertexNormals && geom.morphTargets[0].vertexNormals.length) this.numRowsPerTarget++;\r\n        if (geom.morphTargets[0].tangents && geom.morphTargets[0].tangents.length) this.numRowsPerTarget++;\r\n        if (geom.morphTargets[0].bitangents && geom.morphTargets[0].bitangents.length) this.numRowsPerTarget++;\r\n\r\n        h = geom.morphTargets.length * this.numRowsPerTarget;\r\n\r\n        // console.log(\"this.numRowsPerTarget\", this.numRowsPerTarget);\r\n\r\n        const pixels = new Float32Array(w * h * 4);\r\n        let row = 0;\r\n\r\n        for (let i = 0; i < geom.morphTargets.length; i++)\r\n        {\r\n            if (geom.morphTargets[i].vertices && geom.morphTargets[i].vertices.length)\r\n            {\r\n                for (let j = 0; j < geom.morphTargets[i].vertices.length; j += 3)\r\n                {\r\n                    pixels[((row * w) + (j / 3)) * 4 + 0] = geom.morphTargets[i].vertices[j + 0];\r\n                    pixels[((row * w) + (j / 3)) * 4 + 1] = geom.morphTargets[i].vertices[j + 1];\r\n                    pixels[((row * w) + (j / 3)) * 4 + 2] = geom.morphTargets[i].vertices[j + 2];\r\n                    pixels[((row * w) + (j / 3)) * 4 + 3] = 1;\r\n                }\r\n                row++;\r\n            }\r\n\r\n            if (geom.morphTargets[i].vertexNormals && geom.morphTargets[i].vertexNormals.length)\r\n            {\r\n                for (let j = 0; j < geom.morphTargets[i].vertexNormals.length; j += 3)\r\n                {\r\n                    pixels[(row * w + j / 3) * 4 + 0] = geom.morphTargets[i].vertexNormals[j + 0];\r\n                    pixels[(row * w + j / 3) * 4 + 1] = geom.morphTargets[i].vertexNormals[j + 1];\r\n                    pixels[(row * w + j / 3) * 4 + 2] = geom.morphTargets[i].vertexNormals[j + 2];\r\n                    pixels[(row * w + j / 3) * 4 + 3] = 1;\r\n                }\r\n\r\n                row++;\r\n            }\r\n\r\n            if (geom.morphTargets[i].tangents && geom.morphTargets[i].tangents.length)\r\n            {\r\n                for (let j = 0; j < geom.morphTargets[i].tangents.length; j += 3)\r\n                {\r\n                    pixels[(row * w + j / 3) * 4 + 0] = geom.morphTargets[i].tangents[j + 0];\r\n                    pixels[(row * w + j / 3) * 4 + 1] = geom.morphTargets[i].tangents[j + 1];\r\n                    pixels[(row * w + j / 3) * 4 + 2] = geom.morphTargets[i].tangents[j + 2];\r\n                    pixels[(row * w + j / 3) * 4 + 3] = 1;\r\n                }\r\n                row++;\r\n            }\r\n\r\n            if (geom.morphTargets[i].bitangents && geom.morphTargets[i].bitangents.length)\r\n            {\r\n                for (let j = 0; j < geom.morphTargets[i].bitangents.length; j += 3)\r\n                {\r\n                    pixels[(row * w + j / 3) * 4 + 0] = geom.morphTargets[i].bitangents[j + 0];\r\n                    pixels[(row * w + j / 3) * 4 + 1] = geom.morphTargets[i].bitangents[j + 1];\r\n                    pixels[(row * w + j / 3) * 4 + 2] = geom.morphTargets[i].bitangents[j + 2];\r\n                    pixels[(row * w + j / 3) * 4 + 3] = 1;\r\n                }\r\n                row++;\r\n            }\r\n        }\r\n\r\n        this.tex = new CGL.Texture(cgl, { \"isFloatingPointTexture\": true, \"name\": \"targetsTexture\" });\r\n\r\n        this.tex.initFromData(pixels, w, h, CGL.Texture.FILTER_LINEAR, CGL.Texture.WRAP_REPEAT);\r\n\r\n        // console.log(\"morphTargets generated texture\", w, h);\r\n    }\r\n};\r\n","skin_vert":"int index=int(attrJoints.x);\r\nvec4 newPos = (MOD_boneMats[index] * pos) * attrWeights.x;\r\nvec3 newNorm = (vec4((MOD_boneMats[index] * vec4(norm.xyz, 0.0)) * attrWeights.x).xyz);\r\n\r\nindex=int(attrJoints.y);\r\nnewPos += (MOD_boneMats[index] * pos) * attrWeights.y;\r\nnewNorm = (vec4((MOD_boneMats[index] * vec4(norm.xyz, 0.0)) * attrWeights.y).xyz)+newNorm;\r\n\r\nindex=int(attrJoints.z);\r\nnewPos += (MOD_boneMats[index] * pos) * attrWeights.z;\r\nnewNorm = (vec4((MOD_boneMats[index] * vec4(norm.xyz, 0.0)) * attrWeights.z).xyz)+newNorm;\r\n\r\nindex=int(attrJoints.w);\r\nnewPos += (MOD_boneMats[index] * pos) * attrWeights.w ;\r\nnewNorm = (vec4((MOD_boneMats[index] * vec4(norm.xyz, 0.0)) * attrWeights.w).xyz)+newNorm;\r\n\r\npos=newPos;\r\n\r\nnorm=normalize(newNorm.xyz);\r\n\r\n\r\n","skin_head_vert":"\r\nIN vec4 attrWeights;\r\nIN vec4 attrJoints;\r\nUNI mat4 MOD_boneMats[SKIN_NUM_BONES];\r\n","targets_vert":"\r\n\r\nfloat MOD_width=MOD_targetTexInfo.x;\r\nfloat MOD_height=MOD_targetTexInfo.y;\r\nfloat MOD_numTargets=MOD_targetTexInfo.w;\r\nfloat MOD_numLinesPerTarget=MOD_height/MOD_numTargets;\r\n\r\nfloat halfpix=(1.0/MOD_width)*0.5;\r\nfloat halfpixy=(1.0/MOD_height)*0.5;\r\n\r\nfloat x=(attrVertIndex)/MOD_width+halfpix;\r\n\r\nvec3 off=vec3(0.0);\r\n\r\nfor(float i=0.0;i<MOD_numTargets;i+=1.0)\r\n{\r\n    float y=1.0-((MOD_numLinesPerTarget*i)/MOD_height+halfpixy);\r\n    vec2 coord=vec2(x,y);\r\n    vec3 targetXYZ = texture(MOD_targetTex,coord).xyz;\r\n\r\n    off+=(targetXYZ*MOD_weights[int(i)]);\r\n\r\n\r\n\r\n    coord.y+=1.0/MOD_height; // normals are in next row\r\n    vec3 targetNormal = texture(MOD_targetTex,coord).xyz;\r\n    norm+=targetNormal*MOD_weights[int(i)];\r\n\r\n\r\n}\r\n\r\n// norm=normalize(norm);\r\npos.xyz+=off;\r\n","targets_head_vert":"\r\nUNI float MOD_weights[MOD_NUM_WEIGHTS];\r\n",};
const gltfCamera = class
{
    constructor(gltf, node)
    {
        this.node = node;
        this.name = node.name;
        // console.log(gltf);
        this.config = gltf.json.cameras[node.camera];

        this.pos = vec3.create();
        this.quat = quat.create();
        this.vCenter = vec3.create();
        this.vUp = vec3.create();
        this.vMat = mat4.create();
    }

    updateAnim(time)
    {
        if (this.node && this.node._animTrans)
        {
            vec3.set(this.pos,
                this.node._animTrans[0].getValue(time),
                this.node._animTrans[1].getValue(time),
                this.node._animTrans[2].getValue(time));

            quat.set(this.quat,
                this.node._animRot[0].getValue(time),
                this.node._animRot[1].getValue(time),
                this.node._animRot[2].getValue(time),
                this.node._animRot[3].getValue(time));
        }
    }

    start(time)
    {
        if (cgl.tempData.shadowPass) return;

        this.updateAnim(time);
        const asp = cgl.getViewPort()[2] / cgl.getViewPort()[3];

        cgl.pushPMatrix();
        // mat4.perspective(
        //     cgl.pMatrix,
        //     this.config.perspective.yfov*0.5,
        //     asp,
        //     this.config.perspective.znear,
        //     this.config.perspective.zfar);

        cgl.pushViewMatrix();
        // mat4.identity(cgl.vMatrix);

        // if(this.node && this.node.parent)
        // {
        //     console.log(this.node.parent)
        // vec3.add(this.pos,this.pos,this.node.parent._node.translation);
        // vec3.sub(this.vCenter,this.vCenter,this.node.parent._node.translation);
        // mat4.translate(cgl.vMatrix,cgl.vMatrix,
        // [
        //     -this.node.parent._node.translation[0],
        //     -this.node.parent._node.translation[1],
        //     -this.node.parent._node.translation[2]
        // ])
        // }

        // vec3.set(this.vUp, 0, 1, 0);
        // vec3.set(this.vCenter, 0, -1, 0);
        // // vec3.set(this.vCenter, 0, 1, 0);
        // vec3.transformQuat(this.vCenter, this.vCenter, this.quat);
        // vec3.normalize(this.vCenter, this.vCenter);
        // vec3.add(this.vCenter, this.vCenter, this.pos);

        // mat4.lookAt(cgl.vMatrix, this.pos, this.vCenter, this.vUp);

        let mv = mat4.create();
        mat4.invert(mv, this.node.modelMatAbs());

        // console.log(this.node.modelMatAbs());

        this.vMat = mv;

        mat4.identity(cgl.vMatrix);
        // console.log(mv);
        mat4.mul(cgl.vMatrix, cgl.vMatrix, mv);
    }

    end()
    {
        if (cgl.tempData.shadowPass) return;
        cgl.popPMatrix();
        cgl.popViewMatrix();
    }
};
const le = true; // little endian

const Gltf = class
{
    constructor()
    {
        this.json = {};
        this.accBuffers = [];
        this.meshes = [];
        this.nodes = [];
        this.shaders = [];
        this.timing = [];
        this.cams = [];
        this.startTime = performance.now();
        this.bounds = new CABLES.CG.BoundingBox();
        this.loaded = Date.now();
        this.accBuffersDelete = [];
    }

    getNode(n)
    {
        for (let i = 0; i < this.nodes.length; i++)
        {
            if (this.nodes[i].name == n) return this.nodes[i];
        }
    }

    unHideAll()
    {
        for (let i = 0; i < this.nodes.length; i++)
        {
            this.nodes[i].unHide();
        }
    }
};

function Utf8ArrayToStr(array)
{
    if (window.TextDecoder) return new TextDecoder("utf-8").decode(array);

    let out, i, len, c;
    let char2, char3;

    out = "";
    len = array.length;
    i = 0;
    while (i < len)
    {
        c = array[i++];
        switch (c >> 4)
        {
        case 0: case 1: case 2: case 3: case 4: case 5: case 6: case 7:
            // 0xxxxxxx
            out += String.fromCharCode(c);
            break;
        case 12: case 13:
            // 110x xxxx   10xx xxxx
            char2 = array[i++];
            out += String.fromCharCode(((c & 0x1F) << 6) | (char2 & 0x3F));
            break;
        case 14:
            // 1110 xxxx  10xx xxxx  10xx xxxx
            char2 = array[i++];
            char3 = array[i++];
            out += String.fromCharCode(((c & 0x0F) << 12) |
                    ((char2 & 0x3F) << 6) |
                    ((char3 & 0x3F) << 0));
            break;
        }
    }

    return out;
}

function readChunk(dv, bArr, arrayBuffer, offset)
{
    const chunk = {};

    if (offset >= dv.byteLength)
    {
        // op.log("could not read chunk...");
        return;
    }
    chunk.size = dv.getUint32(offset + 0, le);

    // chunk.type = new TextDecoder("utf-8").decode(bArr.subarray(offset+4, offset+4+4));
    chunk.type = Utf8ArrayToStr(bArr.subarray(offset + 4, offset + 4 + 4));

    if (chunk.type == "BIN\0")
    {
        // console.log(chunk.size,arrayBuffer.length,offset);
        // try
        // {
        chunk.dataView = new DataView(arrayBuffer, offset + 8, chunk.size);
        // }
        // catch(e)
        // {
        //     chunk.dataView = null;
        //     console.log(e);
        // }
    }
    else
    if (chunk.type == "JSON")
    {
        const json = Utf8ArrayToStr(bArr.subarray(offset + 8, offset + 8 + chunk.size));

        try
        {
            const obj = JSON.parse(json);
            chunk.data = obj;
            outGenerator.set(obj.asset.generator);
        }
        catch (e)
        {
        }
    }
    else
    {
        op.warn("unknown type", chunk.type);
    }

    return chunk;
}

function loadAnims(gltf)
{
    const uniqueAnimNames = {};

    for (let i = 0; i < gltf.json.animations.length; i++)
    {
        const an = gltf.json.animations[i];

        an.name = an.name || "unknown";

        for (let ia = 0; ia < an.channels.length; ia++)
        {
            const chan = an.channels[ia];

            const node = gltf.nodes[chan.target.node];
            const sampler = an.samplers[chan.sampler];

            const acc = gltf.json.accessors[sampler.input];
            const bufferIn = gltf.accBuffers[sampler.input];

            const accOut = gltf.json.accessors[sampler.output];
            const bufferOut = gltf.accBuffers[sampler.output];

            gltf.accBuffersDelete.push(sampler.output, sampler.input);

            if (bufferIn && bufferOut)
            {
                let numComps = 1;
                if (accOut.type === "VEC2")numComps = 2;
                else if (accOut.type === "VEC3")numComps = 3;
                else if (accOut.type === "VEC4")numComps = 4;
                else if (accOut.type === "SCALAR")
                {
                    numComps = bufferOut.length / bufferIn.length; // is this really the way to find out ? cant find any other way,except number of morph targets, but not really connected...
                }
                else op.log("[] UNKNOWN accOut.type", accOut.type);

                const anims = [];

                uniqueAnimNames[an.name] = true;

                for (let k = 0; k < numComps; k++)
                {
                    const newAnim = new CABLES.Anim();
                    // newAnim.name=an.name;
                    anims.push(newAnim);
                }

                if (sampler.interpolation === "LINEAR") {}
                else if (sampler.interpolation === "STEP") for (let k = 0; k < numComps; k++) anims[k].defaultEasing = CABLES.EASING_ABSOLUTE;
                else if (sampler.interpolation === "CUBICSPLINE") for (let k = 0; k < numComps; k++) anims[k].defaultEasing = CABLES.EASING_CUBICSPLINE;
                else op.warn("unknown interpolation", sampler.interpolation);

                // console.log(bufferOut)

                // if there is no keyframe for time 0 copy value of first keyframe at time 0
                if (bufferIn[0] !== 0.0)
                    for (let k = 0; k < numComps; k++)
                        anims[k].setValue(0, bufferOut[0 * numComps + k]);

                for (let j = 0; j < bufferIn.length; j++)
                {
                    maxTime = Math.max(bufferIn[j], maxTime);

                    for (let k = 0; k < numComps; k++)
                    {
                        if (anims[k].defaultEasing === CABLES.EASING_CUBICSPLINE)
                        {
                            const idx = ((j * numComps) * 3 + k);

                            const key = anims[k].setValue(bufferIn[j], bufferOut[idx + numComps]);
                            key.bezTangIn = bufferOut[idx];
                            key.bezTangOut = bufferOut[idx + (numComps * 2)];

                            // console.log(an.name,k,bufferOut[idx+1]);
                        }
                        else
                        {
                            // console.log(an.name,k,bufferOut[j * numComps + k]);
                            anims[k].setValue(bufferIn[j], bufferOut[j * numComps + k]);
                        }
                    }
                }

                node.setAnim(chan.target.path, an.name, anims);
            }
            else
            {
                op.warn("loadAmins bufferIn undefined ", bufferIn === undefined);
                op.warn("loadAmins bufferOut undefined ", bufferOut === undefined);
                op.warn("loadAmins ", an.name, sampler, accOut);
                op.warn("loadAmins num accBuffers", gltf.accBuffers.length);
                op.warn("loadAmins num accessors", gltf.json.accessors.length);
            }
        }
    }

    gltf.uniqueAnimNames = uniqueAnimNames;

    outAnims.setRef(Object.keys(uniqueAnimNames));
}

function loadCams(gltf)
{
    if (!gltf || !gltf.json.cameras) return;

    gltf.cameras = gltf.cameras || [];

    for (let i = 0; i < gltf.nodes.length; i++)
    {
        if (gltf.nodes[i].hasOwnProperty("camera"))
        {
            const cam = new gltfCamera(gltf, gltf.nodes[i]);
            gltf.cameras.push(cam);
        }
    }
}

function loadAfterDraco()
{
    if (!window.DracoDecoder)
    {
        setTimeout(() =>
        {
            loadAfterDraco();
        }, 100);
    }

    reloadSoon();
}

function parseGltf(arrayBuffer)
{
    const CHUNK_HEADER_SIZE = 8;

    let j = 0, i = 0;

    const gltf = new Gltf();
    gltf.timing.push(["Start parsing", Math.round((performance.now() - gltf.startTime))]);

    if (!arrayBuffer) return;
    const byteArray = new Uint8Array(arrayBuffer);
    let pos = 0;

    // var string = new TextDecoder("utf-8").decode(byteArray.subarray(pos, 4));
    const string = Utf8ArrayToStr(byteArray.subarray(pos, 4));
    pos += 4;
    if (string != "glTF") return;

    gltf.timing.push(["dataview", Math.round((performance.now() - gltf.startTime))]);

    const dv = new DataView(arrayBuffer);
    const version = dv.getUint32(pos, le);
    pos += 4;
    const size = dv.getUint32(pos, le);
    pos += 4;

    outVersion.set(version);

    const chunks = [];
    gltf.chunks = chunks;

    chunks.push(readChunk(dv, byteArray, arrayBuffer, pos));
    pos += chunks[0].size + CHUNK_HEADER_SIZE;
    gltf.json = chunks[0].data;

    gltf.cables = {
        "fileUrl": inFile.get(),
        "shortFileName": CABLES.basename(inFile.get())
    };

    outJson.setRef(gltf.json);
    outExtensions.setRef(gltf.json.extensionsUsed || []);

    let ch = readChunk(dv, byteArray, arrayBuffer, pos);
    while (ch)
    {
        chunks.push(ch);
        pos += ch.size + CHUNK_HEADER_SIZE;
        ch = readChunk(dv, byteArray, arrayBuffer, pos);
    }

    gltf.chunks = chunks;

    const views = chunks[0].data.bufferViews;
    const accessors = chunks[0].data.accessors;

    gltf.timing.push(["Parse buffers", Math.round((performance.now() - gltf.startTime))]);

    if (gltf.json.extensionsUsed && gltf.json.extensionsUsed.indexOf("KHR_draco_mesh_compression") > -1)
    {
        if (!window.DracoDecoder)
        {
            op.setUiError("gltfdraco", "GLTF draco compression lib not found / add draco op to your patch!");

            loadAfterDraco();
            return gltf;
        }
        else
        {
            gltf.useDraco = true;
        }
    }

    op.setUiError("gltfdraco", null);
    // let accPos = (view.byteOffset || 0) + (acc.byteOffset || 0);

    if (views)
    {
        for (i = 0; i < accessors.length; i++)
        {
            const acc = accessors[i];
            const view = views[acc.bufferView];

            let numComps = 0;
            if (acc.type == "SCALAR")numComps = 1;
            else if (acc.type == "VEC2")numComps = 2;
            else if (acc.type == "VEC3")numComps = 3;
            else if (acc.type == "VEC4")numComps = 4;
            else if (acc.type == "MAT4")numComps = 16;
            else console.error("unknown accessor type", acc.type);

            //   const decoder = new decoderModule.Decoder();
            //   const decodedGeometry = decodeDracoData(data, decoder);
            //   // Encode mesh
            //   encodeMeshToFile(decodedGeometry, decoder);

            //   decoderModule.destroy(decoder);
            //   decoderModule.destroy(decodedGeometry);

            // 5120 (BYTE)	1
            // 5121 (UNSIGNED_BYTE)	1
            // 5122 (SHORT)	2

            if (chunks[1].dataView)
            {
                if (view)
                {
                    const num = acc.count * numComps;
                    let accPos = (view.byteOffset || 0) + (acc.byteOffset || 0);
                    let stride = view.byteStride || 0;
                    let dataBuff = null;

                    if (acc.componentType == 5126 || acc.componentType == 5125) // 4byte FLOAT or INT
                    {
                        stride = stride || 4;

                        const isInt = acc.componentType == 5125;
                        if (isInt)dataBuff = new Uint32Array(num);
                        else dataBuff = new Float32Array(num);

                        dataBuff.cblStride = numComps;

                        for (j = 0; j < num; j++)
                        {
                            if (isInt) dataBuff[j] = chunks[1].dataView.getUint32(accPos, le);
                            else dataBuff[j] = chunks[1].dataView.getFloat32(accPos, le);

                            if (stride != 4 && (j + 1) % numComps === 0)accPos += stride - (numComps * 4);
                            accPos += 4;
                        }
                    }
                    else if (acc.componentType == 5123) // UNSIGNED_SHORT
                    {
                        stride = stride || 2;

                        dataBuff = new Uint16Array(num);
                        dataBuff.cblStride = stride;

                        for (j = 0; j < num; j++)
                        {
                            dataBuff[j] = chunks[1].dataView.getUint16(accPos, le);

                            if (stride != 2 && (j + 1) % numComps === 0) accPos += stride - (numComps * 2);

                            accPos += 2;
                        }
                    }
                    else if (acc.componentType == 5121) // UNSIGNED_BYTE
                    {
                        stride = stride || 1;

                        dataBuff = new Uint8Array(num);
                        dataBuff.cblStride = stride;

                        for (j = 0; j < num; j++)
                        {
                            dataBuff[j] = chunks[1].dataView.getUint8(accPos, le);

                            if (stride != 1 && (j + 1) % numComps === 0) accPos += stride - (numComps * 1);

                            accPos += 1;
                        }
                    }

                    else
                    {
                        console.error("unknown component type", acc.componentType);
                    }

                    gltf.accBuffers.push(dataBuff);
                }
                else
                {
                    // console.log("has no dataview");
                }
            }
        }
    }

    gltf.timing.push(["Parse mesh groups", Math.round((performance.now() - gltf.startTime))]);

    gltf.json.meshes = gltf.json.meshes || [];

    if (gltf.json.meshes)
    {
        for (i = 0; i < gltf.json.meshes.length; i++)
        {
            const mesh = new gltfMeshGroup(gltf, gltf.json.meshes[i]);
            gltf.meshes.push(mesh);
        }
    }

    gltf.timing.push(["Parse nodes", Math.round((performance.now() - gltf.startTime))]);

    for (i = 0; i < gltf.json.nodes.length; i++)
    {
        if (gltf.json.nodes[i].children)
            for (j = 0; j < gltf.json.nodes[i].children.length; j++)
            {
                gltf.json.nodes[gltf.json.nodes[i].children[j]].isChild = true;
            }
    }

    for (i = 0; i < gltf.json.nodes.length; i++)
    {
        const node = new gltfNode(gltf.json.nodes[i], gltf);
        gltf.nodes.push(node);
    }

    for (i = 0; i < gltf.nodes.length; i++)
    {
        const node = gltf.nodes[i];

        if (!node.children) continue;
        for (let j = 0; j < node.children.length; j++)
        {
            gltf.nodes[node.children[j]].parent = node;
        }
    }

    for (i = 0; i < gltf.nodes.length; i++)
    {
        gltf.nodes[i].initSkin();
    }

    needsMatUpdate = true;

    gltf.timing.push(["load anims", Math.round((performance.now() - gltf.startTime))]);

    if (gltf.json.animations) loadAnims(gltf);

    gltf.timing.push(["load cameras", Math.round((performance.now() - gltf.startTime))]);

    if (gltf.json.cameras) loadCams(gltf);

    gltf.timing.push(["finished", Math.round((performance.now() - gltf.startTime))]);
    return gltf;
}
let gltfMesh = class
{
    constructor(name, prim, gltf, finished)
    {
        this.POINTS = 0;
        this.LINES = 1;
        this.LINE_LOOP = 2;
        this.LINE_STRIP = 3;
        this.TRIANGLES = 4;
        this.TRIANGLE_STRIP = 5;
        this.TRIANGLE_FAN = 6;

        this.test = 0;
        this.name = name;
        this.submeshIndex = 0;
        this.material = prim.material;
        this.mesh = null;
        this.geom = new CGL.Geometry("gltf_" + this.name);
        this.geom.verticesIndices = [];
        this.bounds = null;
        this.primitive = 4;
        this.morphTargetsRenderMod = null;
        this.weights = prim.weights;

        if (prim.hasOwnProperty("mode")) this.primitive = prim.mode;

        if (prim.hasOwnProperty("indices")) this.geom.verticesIndices = gltf.accBuffers[prim.indices];

        gltf.loadingMeshes = gltf.loadingMeshes || 0;
        gltf.loadingMeshes++;

        this.materialJson =
            this._matPbrMetalness =
            this._matPbrRoughness =
            this._matDiffuseColor = null;

        if (gltf.json.materials)
        {
            if (this.material != -1) this.materialJson = gltf.json.materials[this.material];

            if (this.materialJson && this.materialJson.pbrMetallicRoughness)
            {
                if (!this.materialJson.pbrMetallicRoughness.hasOwnProperty("baseColorFactor"))
                {
                    this._matDiffuseColor = [1, 1, 1, 1];
                }
                else
                {
                    this._matDiffuseColor = this.materialJson.pbrMetallicRoughness.baseColorFactor;
                }

                this._matDiffuseColor = this.materialJson.pbrMetallicRoughness.baseColorFactor;

                if (!this.materialJson.pbrMetallicRoughness.hasOwnProperty("metallicFactor"))
                {
                    this._matPbrMetalness = 1.0;
                }
                else
                {
                    this._matPbrMetalness = this.materialJson.pbrMetallicRoughness.metallicFactor || null;
                }

                if (!this.materialJson.pbrMetallicRoughness.hasOwnProperty("roughnessFactor"))
                {
                    this._matPbrRoughness = 1.0;
                }
                else
                {
                    this._matPbrRoughness = this.materialJson.pbrMetallicRoughness.roughnessFactor || null;
                }
            }
        }

        if (gltf.useDraco && prim.extensions.KHR_draco_mesh_compression)
        {
            const view = gltf.chunks[0].data.bufferViews[prim.extensions.KHR_draco_mesh_compression.bufferView];
            const num = view.byteLength;
            const dataBuff = new Int8Array(num);
            let accPos = (view.byteOffset || 0);// + (acc.byteOffset || 0);
            for (let j = 0; j < num; j++)
            {
                dataBuff[j] = gltf.chunks[1].dataView.getInt8(accPos, le);
                accPos++;
            }

            const dracoDecoder = window.DracoDecoder;
            dracoDecoder.decodeGeometry(dataBuff.buffer, (geometry) =>
            {
                const geom = new CGL.Geometry("draco mesh " + name);

                for (let i = 0; i < geometry.attributes.length; i++)
                {
                    const attr = geometry.attributes[i];

                    if (attr.name === "position") geom.vertices = attr.array;
                    else if (attr.name === "normal") geom.vertexNormals = attr.array;
                    else if (attr.name === "uv") geom.texCoords = attr.array;
                    else if (attr.name === "color") geom.vertexColors = this.calcVertexColors(attr.array);
                    else if (attr.name === "joints") geom.setAttribute("attrJoints", Array.from(attr.array), 4);
                    else if (attr.name === "weights")
                    {
                        const arr4 = new Float32Array(attr.array.length / attr.itemSize * 4);

                        for (let k = 0; k < attr.array.length / attr.itemSize; k++)
                        {
                            arr4[k * 4] = arr4[k * 4 + 1] = arr4[k * 4 + 2] = arr4[k * 4 + 3] = 0;
                            for (let j = 0; j < attr.itemSize; j++)
                                arr4[k * 4 + j] = attr.array[k * attr.itemSize + j];
                        }
                        geom.setAttribute("attrWeights", arr4, 4);
                    }
                    else op.logWarn("unknown draco attrib", attr);
                }

                geometry.attributes = null;
                geom.verticesIndices = geometry.index.array;

                this.setGeom(geom);

                this.mesh = null;
                gltf.loadingMeshes--;
                gltf.timing.push(["draco decode", Math.round((performance.now() - gltf.startTime))]);

                if (finished)finished(this);
            }, (error) => { op.logError(error); });
        }
        else
        {
            gltf.loadingMeshes--;
            this.fillGeomAttribs(gltf, this.geom, prim.attributes);

            if (prim.targets)
            {
                for (let j = 0; j < prim.targets.length; j++)
                {
                    const tgeom = new CGL.Geometry("gltf_target_" + j);

                    // if (prim.hasOwnProperty("indices")) tgeom.verticesIndices = gltf.accBuffers[prim.indices];

                    this.fillGeomAttribs(gltf, tgeom, prim.targets[j], false);

                    // { // calculate normals for final position of morphtarget for later...
                    //     for (let i = 0; i < tgeom.vertices.length; i++) tgeom.vertices[i] += this.geom.vertices[i];
                    //     tgeom.calculateNormals();
                    //     for (let i = 0; i < tgeom.vertices.length; i++) tgeom.vertices[i] -= this.geom.vertices[i];
                    // }

                    this.geom.morphTargets.push(tgeom);
                }
            }
            if (finished)finished(this);
        }
    }

    _linearToSrgb(x)
    {
        if (x <= 0)
            return 0;
        else if (x >= 1)
            return 1;
        else if (x < 0.0031308)
            return x * 12.92;
        else
            return x ** (1 / 2.2) * 1.055 - 0.055;
    }

    calcVertexColors(arr, type)
    {
        let vertexColors = null;
        if (arr instanceof Float32Array)
        {
            let div = false;
            for (let i = 0; i < arr.length; i++)
            {
                if (arr[i] > 1)
                {
                    div = true;
                    continue;
                }
            }

            if (div)
                for (let i = 0; i < arr.length; i++) arr[i] /= 65535;

            vertexColors = arr;
        }

        else if (arr instanceof Uint16Array)
        {
            const fb = new Float32Array(arr.length);
            for (let i = 0; i < arr.length; i++) fb[i] = arr[i] / 65535;

            vertexColors = fb;
        }
        else vertexColors = arr;

        for (let i = 0; i < vertexColors.length; i++)
        {
            vertexColors[i] = this._linearToSrgb(vertexColors[i]);
        }

        if (arr.cblStride == 3)
        {
            const nc = new Float32Array(vertexColors.length / 3 * 4);
            for (let i = 0; i < vertexColors.length / 3; i++)
            {
                nc[i * 4 + 0] = vertexColors[i * 3 + 0];
                nc[i * 4 + 1] = vertexColors[i * 3 + 1];
                nc[i * 4 + 2] = vertexColors[i * 3 + 2];
                nc[i * 4 + 3] = 1;
            }
            vertexColors = nc;
        }

        return vertexColors;
    }

    fillGeomAttribs(gltf, tgeom, attribs, setGeom)
    {
        if (attribs.hasOwnProperty("POSITION")) tgeom.vertices = gltf.accBuffers[attribs.POSITION];
        if (attribs.hasOwnProperty("NORMAL")) tgeom.vertexNormals = gltf.accBuffers[attribs.NORMAL];
        if (attribs.hasOwnProperty("TANGENT")) tgeom.tangents = gltf.accBuffers[attribs.TANGENT];

        // // console.log(gltf.accBuffers[attribs.COLOR_0])
        // console.log(gltf);

        if (attribs.hasOwnProperty("COLOR_0")) tgeom.vertexColors = this.calcVertexColors(gltf.accBuffers[attribs.COLOR_0], gltf.accBuffers[attribs.COLOR_0].type);
        if (attribs.hasOwnProperty("COLOR_1")) tgeom.setAttribute("attrVertColor1", this.calcVertexColors(gltf.accBuffers[attribs.COLOR_1]), gltf.accBuffers[attribs.COLOR_1].type);
        if (attribs.hasOwnProperty("COLOR_2")) tgeom.setAttribute("attrVertColor2", this.calcVertexColors(gltf.accBuffers[attribs.COLOR_2]), gltf.accBuffers[attribs.COLOR_2].type);
        if (attribs.hasOwnProperty("COLOR_3")) tgeom.setAttribute("attrVertColor3", this.calcVertexColors(gltf.accBuffers[attribs.COLOR_3]), gltf.accBuffers[attribs.COLOR_3].type);
        if (attribs.hasOwnProperty("COLOR_4")) tgeom.setAttribute("attrVertColor4", this.calcVertexColors(gltf.accBuffers[attribs.COLOR_4]), gltf.accBuffers[attribs.COLOR_4].type);

        if (attribs.hasOwnProperty("TEXCOORD_0")) tgeom.texCoords = gltf.accBuffers[attribs.TEXCOORD_0];
        if (attribs.hasOwnProperty("TEXCOORD_1")) tgeom.setAttribute("attrTexCoord1", gltf.accBuffers[attribs.TEXCOORD_1], 2);
        if (attribs.hasOwnProperty("TEXCOORD_2")) tgeom.setAttribute("attrTexCoord2", gltf.accBuffers[attribs.TEXCOORD_2], 2);
        if (attribs.hasOwnProperty("TEXCOORD_3")) tgeom.setAttribute("attrTexCoord3", gltf.accBuffers[attribs.TEXCOORD_3], 2);
        if (attribs.hasOwnProperty("TEXCOORD_4")) tgeom.setAttribute("attrTexCoord4", gltf.accBuffers[attribs.TEXCOORD_4], 2);

        if (attribs.hasOwnProperty("WEIGHTS_0"))
        {
            tgeom.setAttribute("attrWeights", gltf.accBuffers[attribs.WEIGHTS_0], 4);
        }
        if (attribs.hasOwnProperty("JOINTS_0"))
        {
            if (!gltf.accBuffers[attribs.JOINTS_0])console.log("no !gltf.accBuffers[attribs.JOINTS_0]");
            tgeom.setAttribute("attrJoints", gltf.accBuffers[attribs.JOINTS_0], 4);
        }

        if (attribs.hasOwnProperty("POSITION")) gltf.accBuffersDelete.push(attribs.POSITION);
        if (attribs.hasOwnProperty("NORMAL")) gltf.accBuffersDelete.push(attribs.NORMAL);
        if (attribs.hasOwnProperty("TEXCOORD_0")) gltf.accBuffersDelete.push(attribs.TEXCOORD_0);
        if (attribs.hasOwnProperty("TANGENT")) gltf.accBuffersDelete.push(attribs.TANGENT);
        if (attribs.hasOwnProperty("COLOR_0"))gltf.accBuffersDelete.push(attribs.COLOR_0);
        if (attribs.hasOwnProperty("COLOR_0"))gltf.accBuffersDelete.push(attribs.COLOR_0);
        if (attribs.hasOwnProperty("COLOR_1"))gltf.accBuffersDelete.push(attribs.COLOR_1);
        if (attribs.hasOwnProperty("COLOR_2"))gltf.accBuffersDelete.push(attribs.COLOR_2);
        if (attribs.hasOwnProperty("COLOR_3"))gltf.accBuffersDelete.push(attribs.COLOR_3);

        if (attribs.hasOwnProperty("TEXCOORD_1")) gltf.accBuffersDelete.push(attribs.TEXCOORD_1);
        if (attribs.hasOwnProperty("TEXCOORD_2")) gltf.accBuffersDelete.push(attribs.TEXCOORD_2);
        if (attribs.hasOwnProperty("TEXCOORD_3")) gltf.accBuffersDelete.push(attribs.TEXCOORD_3);
        if (attribs.hasOwnProperty("TEXCOORD_4")) gltf.accBuffersDelete.push(attribs.TEXCOORD_4);

        if (setGeom !== false) if (tgeom && tgeom.verticesIndices) this.setGeom(tgeom);
    }

    setGeom(geom)
    {
        if (inNormFormat.get() == "X-ZY")
        {
            for (let i = 0; i < geom.vertexNormals.length; i += 3)
            {
                let t = geom.vertexNormals[i + 2];
                geom.vertexNormals[i + 2] = geom.vertexNormals[i + 1];
                geom.vertexNormals[i + 1] = -t;
            }
        }

        if (inVertFormat.get() == "XZ-Y")
        {
            for (let i = 0; i < geom.vertices.length; i += 3)
            {
                let t = geom.vertices[i + 2];
                geom.vertices[i + 2] = -geom.vertices[i + 1];
                geom.vertices[i + 1] = t;
            }
        }

        if (this.primitive == this.TRIANGLES)
        {
            if (inCalcNormals.get() == "Force Smooth" || inCalcNormals.get() == false) geom.calculateNormals();
            else if (!geom.vertexNormals.length && inCalcNormals.get() == "Auto") geom.calculateNormals({ "smooth": false });

            if ((!geom.biTangents || geom.biTangents.length == 0) && geom.tangents)
            {
                const bitan = vec3.create();
                const tan = vec3.create();

                const tangents = geom.tangents;
                geom.tangents = new Float32Array(tangents.length / 4 * 3);
                geom.biTangents = new Float32Array(tangents.length / 4 * 3);

                for (let i = 0; i < tangents.length; i += 4)
                {
                    const idx = i / 4 * 3;

                    vec3.cross(
                        bitan,
                        [geom.vertexNormals[idx], geom.vertexNormals[idx + 1], geom.vertexNormals[idx + 2]],
                        [tangents[i], tangents[i + 1], tangents[i + 2]]
                    );

                    vec3.div(bitan, bitan, [tangents[i + 3], tangents[i + 3], tangents[i + 3]]);
                    vec3.normalize(bitan, bitan);

                    geom.biTangents[idx + 0] = bitan[0];
                    geom.biTangents[idx + 1] = bitan[1];
                    geom.biTangents[idx + 2] = bitan[2];

                    geom.tangents[idx + 0] = tangents[i + 0];
                    geom.tangents[idx + 1] = tangents[i + 1];
                    geom.tangents[idx + 2] = tangents[i + 2];
                }
            }

            if (geom.tangents.length === 0 || inCalcNormals.get() != "Never")
            {
                // console.log("[gltf ]no tangents... calculating tangents...");
                geom.calcTangentsBitangents();
            }
        }

        this.geom = geom;

        this.bounds = geom.getBounds();
    }

    render(cgl, ignoreMaterial, skinRenderer)
    {
        if (!this.mesh && this.geom && this.geom.verticesIndices)
        {
            let g = this.geom;
            if (this.geom.vertices.length / 3 > 64000 && this.geom.verticesIndices.length > 0)
            {
                g = this.geom.copy();
                g.unIndex(false, true);
            }

            let glprim;

            if (cgl.gl)
            {
                if (this.primitive == this.TRIANGLES)glprim = cgl.gl.TRIANGLES;
                else if (this.primitive == this.LINES)glprim = cgl.gl.LINES;
                else if (this.primitive == this.LINE_STRIP)glprim = cgl.gl.LINE_STRIP;
                else if (this.primitive == this.POINTS)glprim = cgl.gl.POINTS;
                else
                {
                    op.logWarn("unknown primitive type", this);
                }
            }

            this.mesh = op.patch.cg.createMesh(g, { "glPrimitive": glprim });
        }

        if (this.mesh)
        {
            // update morphTargets
            if (this.geom && this.geom.morphTargets.length && !this.morphTargetsRenderMod)
            {
                this.mesh.addVertexNumbers = true;
                this.morphTargetsRenderMod = new GltfTargetsRenderer(this);
            }

            let useMat = !ignoreMaterial && this.material != -1 && gltf.shaders[this.material];
            if (skinRenderer)useMat = false;

            if (useMat) cgl.pushShader(gltf.shaders[this.material]);

            const currentShader = cgl.getShader() || {};
            const uniDiff = currentShader.uniformColorDiffuse;

            const uniPbrMetalness = currentShader.uniformPbrMetalness;
            const uniPbrRoughness = currentShader.uniformPbrRoughness;

            // if (gltf.shaders[this.material] && !inUseMatProps.get())
            // {
            //     gltf.shaders[this.material]=null;
            // }

            if (!gltf.shaders[this.material] && inUseMatProps.get())
            {
                if (uniDiff && this._matDiffuseColor)
                {
                    this._matDiffuseColorOrig = [uniDiff.getValue()[0], uniDiff.getValue()[1], uniDiff.getValue()[2], uniDiff.getValue()[3]];
                    uniDiff.setValue(this._matDiffuseColor);
                }

                if (uniPbrMetalness)
                    if (this._matPbrMetalness != null)
                    {
                        this._matPbrMetalnessOrig = uniPbrMetalness.getValue();
                        uniPbrMetalness.setValue(this._matPbrMetalness);
                    }
                    else
                        uniPbrMetalness.setValue(0);

                if (uniPbrRoughness)
                    if (this._matPbrRoughness != null)
                    {
                        this._matPbrRoughnessOrig = uniPbrRoughness.getValue();
                        uniPbrRoughness.setValue(this._matPbrRoughness);
                    }
                    else
                    {
                        uniPbrRoughness.setValue(0);
                    }
            }

            if (this.morphTargetsRenderMod) this.morphTargetsRenderMod.renderStart(cgl, 0);
            if (this.mesh)
            {
                this.mesh.render(cgl.getShader(), ignoreMaterial);
            }
            if (this.morphTargetsRenderMod) this.morphTargetsRenderMod.renderFinish(cgl);

            if (inUseMatProps.get())
            {
                if (uniDiff && this._matDiffuseColor) uniDiff.setValue(this._matDiffuseColorOrig);
                if (uniPbrMetalness && this._matPbrMetalnessOrig != undefined) uniPbrMetalness.setValue(this._matPbrMetalnessOrig);
                if (uniPbrRoughness && this._matPbrRoughnessOrig != undefined) uniPbrRoughness.setValue(this._matPbrRoughnessOrig);
            }

            if (useMat) cgl.popShader();
        }
        else
        {
            console.log("no mesh......");
        }
    }
};
const gltfMeshGroup = class
{
    constructor(gltf, m)
    {
        this.bounds = new CABLES.CG.BoundingBox();
        this.meshes = [];

        m.name = m.name || ("unknown mesh " + CABLES.simpleId());

        this.name = m.name;
        const prims = m.primitives;

        for (let i = 0; i < prims.length; i++)
        {
            const mesh = new gltfMesh(this.name, prims[i], gltf,
                (mesh) =>
                {
                    mesh.extras = m.extras;
                    this.bounds.apply(mesh.bounds);
                });

            mesh.submeshIndex = i;
            this.meshes.push(mesh);
        }
    }

    render(cgl, ignoreMat, skinRenderer, _time, weights)
    {
        for (let i = 0; i < this.meshes.length; i++)
        {
            const useMat = gltf.shaders[this.meshes[i].material];

            if (!ignoreMat && useMat) cgl.pushShader(gltf.shaders[this.meshes[i].material]);
            if (skinRenderer)skinRenderer.renderStart(cgl, _time);
            if (weights) this.meshes[i].weights = weights;
            this.meshes[i].render(cgl, ignoreMat, skinRenderer, _time);
            if (skinRenderer)skinRenderer.renderFinish(cgl);
            if (!ignoreMat && useMat) cgl.popShader();
        }
    }
};
const gltfNode = class
{
    constructor(node, gltf)
    {
        this.isChild = node.isChild || false;
        node.name = node.name || "unknown node " + CABLES.simpleId();
        this.name = node.name;
        if (node.hasOwnProperty("camera")) this.camera = node.camera;
        this.hidden = false;
        this.mat = mat4.create();
        this._animActions = {};
        this.animWeights = [];
        this._animMat = mat4.create();
        this._tempMat = mat4.create();
        this._tempQuat = quat.create();
        this._tempRotmat = mat4.create();
        this.mesh = null;
        this.children = [];
        this._node = node;
        this._gltf = gltf;
        this.absMat = mat4.create();
        this.addTranslate = null;
        this._tempAnimScale = null;
        this.addMulMat = null;
        this.updateMatrix();
        this.skinRenderer = null;
        this.copies = [];
    }

    get skin()
    {
        if (this._node.hasOwnProperty("skin")) return this._node.skin;
        else return -1;
    }

    copy()
    {
        this.isCopy = true;
        const n = new gltfNode(this._node, this._gltf);
        n.copyOf = this;

        n._animActions = this._animActions;
        n.children = this.children;
        if (this.skin) n.skinRenderer = new GltfSkin(this);

        this.updateMatrix();
        return n;
    }

    hasSkin()
    {
        if (this._node.hasOwnProperty("skin")) return this._gltf.json.skins[this._node.skin].name || "unknown";
        return false;
    }

    initSkin()
    {
        if (this.skin > -1)
        {
            this.skinRenderer = new GltfSkin(this);
        }
    }

    updateMatrix()
    {
        mat4.identity(this.mat);
        if (this._node.translation) mat4.translate(this.mat, this.mat, this._node.translation);

        if (this._node.rotation)
        {
            const rotmat = mat4.create();
            this._rot = this._node.rotation;

            mat4.fromQuat(rotmat, this._node.rotation);
            mat4.mul(this.mat, this.mat, rotmat);
        }

        if (this._node.scale)
        {
            this._scale = this._node.scale;
            mat4.scale(this.mat, this.mat, this._scale);
        }

        if (this._node.hasOwnProperty("mesh"))
        {
            this.mesh = this._gltf.meshes[this._node.mesh];
            if (this.isCopy)
            {
            }
        }

        if (this._node.children)
        {
            for (let i = 0; i < this._node.children.length; i++)
            {
                this._gltf.json.nodes[i].isChild = true;
                if (this._gltf.nodes[this._node.children[i]]) this._gltf.nodes[this._node.children[i]].isChild = true;
                this.children.push(this._node.children[i]);
            }
        }
    }

    unHide()
    {
        this.hidden = false;
        for (let i = 0; i < this.children.length; i++)
            if (this.children[i].unHide) this.children[i].unHide();
    }

    calcBounds(gltf, mat, bounds)
    {
        const localMat = mat4.create();

        if (mat) mat4.copy(localMat, mat);
        if (this.mat) mat4.mul(localMat, localMat, this.mat);

        if (this.mesh)
        {
            const bb = this.mesh.bounds.copy();
            bb.mulMat4(localMat);
            bounds.apply(bb);

            if (bounds.changed)
            {
                boundingPoints.push(
                    bb._min[0] || 0, bb._min[1] || 0, bb._min[2] || 0,
                    bb._max[0] || 0, bb._max[1] || 0, bb._max[2] || 0);
            }
        }

        for (let i = 0; i < this.children.length; i++)
        {
            if (gltf.nodes[this.children[i]] && gltf.nodes[this.children[i]].calcBounds)
            {
                const b = gltf.nodes[this.children[i]].calcBounds(gltf, localMat, bounds);

                bounds.apply(b);
            }
        }

        if (bounds.changed) return bounds;
        else return null;
    }

    setAnimAction(name)
    {
        if (!name) return;

        this._currentAnimaction = name;

        if (name && !this._animActions[name]) return null;

        for (let path in this._animActions[name])
        {
            if (path == "translation") this._animTrans = this._animActions[name][path];
            else if (path == "rotation") this._animRot = this._animActions[name][path];
            else if (path == "scale") this._animScale = this._animActions[name][path];
            else if (path == "weights") this.animWeights = this._animActions[name][path];
        }
    }

    setAnim(path, name, anims)
    {
        if (!path || !name || !anims) return;

        this._animActions[name] = this._animActions[name] || {};

        // debugger;

        // for (let i = 0; i < this.copies.length; i++) this.copies[i]._animActions = this._animActions;

        if (this._animActions[name][path]) op.log("[gltfNode] animation action path already exists", name, path, this._animActions[name][path]);

        this._animActions[name][path] = anims;

        if (path == "translation") this._animTrans = anims;
        else if (path == "rotation") this._animRot = anims;
        else if (path == "scale") this._animScale = anims;
        else if (path == "weights") this.animWeights = this._animActions[name][path];
    }

    modelMatLocal()
    {
        return this._animMat || this.mat;
    }

    modelMatAbs()
    {
        return this.absMat;
    }

    transform(cgl, _time)
    {
        if (!_time && _time != 0)_time = time;

        this._lastTimeTrans = _time;

        gltfTransforms++;

        if (!this._animTrans && !this._animRot && !this._animScale)
        {
            mat4.mul(cgl.mMatrix, cgl.mMatrix, this.mat);
            this._animMat = null;
        }
        else
        {
            this._animMat = this._animMat || mat4.create();
            mat4.identity(this._animMat);

            const playAnims = true;

            if (playAnims && this._animTrans)
            {
                mat4.translate(this._animMat, this._animMat, [
                    this._animTrans[0].getValue(_time),
                    this._animTrans[1].getValue(_time),
                    this._animTrans[2].getValue(_time)]);
            }
            else
            if (this._node.translation) mat4.translate(this._animMat, this._animMat, this._node.translation);

            if (playAnims && this._animRot)
            {
                if (this._animRot[0].defaultEasing == CABLES.EASING_LINEAR) CABLES.Anim.slerpQuaternion(_time, this._tempQuat, this._animRot[0], this._animRot[1], this._animRot[2], this._animRot[3]);
                else if (this._animRot[0].defaultEasing == CABLES.EASING_ABSOLUTE)
                {
                    this._tempQuat[0] = this._animRot[0].getValue(_time);
                    this._tempQuat[1] = this._animRot[1].getValue(_time);
                    this._tempQuat[2] = this._animRot[2].getValue(_time);
                    this._tempQuat[3] = this._animRot[3].getValue(_time);
                }
                else if (this._animRot[0].defaultEasing == CABLES.EASING_CUBICSPLINE)
                {
                    CABLES.Anim.slerpQuaternion(_time, this._tempQuat, this._animRot[0], this._animRot[1], this._animRot[2], this._animRot[3]);
                }

                mat4.fromQuat(this._tempMat, this._tempQuat);
                mat4.mul(this._animMat, this._animMat, this._tempMat);
            }
            else if (this._rot)
            {
                mat4.fromQuat(this._tempRotmat, this._rot);
                mat4.mul(this._animMat, this._animMat, this._tempRotmat);
            }

            if (playAnims && this._animScale)
            {
                if (!this._tempAnimScale) this._tempAnimScale = [1, 1, 1];
                this._tempAnimScale[0] = this._animScale[0].getValue(_time);
                this._tempAnimScale[1] = this._animScale[1].getValue(_time);
                this._tempAnimScale[2] = this._animScale[2].getValue(_time);
                mat4.scale(this._animMat, this._animMat, this._tempAnimScale);
            }
            else if (this._scale) mat4.scale(this._animMat, this._animMat, this._scale);

            mat4.mul(cgl.mMatrix, cgl.mMatrix, this._animMat);
        }

        if (this.animWeights)
        {
            this.weights = this.weights || [];

            let str = "";
            for (let i = 0; i < this.animWeights.length; i++)
            {
                this.weights[i] = this.animWeights[i].getValue(_time);
                str += this.weights[i] + "/";
            }

            // this.mesh.weights=this.animWeights.get(_time);
        }

        if (this.addTranslate) mat4.translate(cgl.mMatrix, cgl.mMatrix, this.addTranslate);

        if (this.addMulMat) mat4.mul(cgl.mMatrix, cgl.mMatrix, this.addMulMat);

        mat4.copy(this.absMat, cgl.mMatrix);
    }

    render(cgl, dontTransform, dontDrawMesh, ignoreMaterial, ignoreChilds, drawHidden, _time)
    {
        if (!dontTransform) cgl.pushModelMatrix();

        if (_time === undefined) _time = gltf.time;

        if (!dontTransform || this.skinRenderer) this.transform(cgl, _time);

        if (this.hidden && !drawHidden)
        {
        }
        else
        {
            if (this.skinRenderer)
            {
                this.skinRenderer.time = _time;
                if (!dontDrawMesh)
                    this.mesh.render(cgl, ignoreMaterial, this.skinRenderer, _time, this.weights);
            }
            else
            {
                if (this.mesh && !dontDrawMesh)
                    this.mesh.render(cgl, ignoreMaterial, null, _time, this.weights);
            }
        }

        if (!ignoreChilds && !this.hidden)
            for (let i = 0; i < this.children.length; i++)
                if (gltf.nodes[this.children[i]])
                    gltf.nodes[this.children[i]].render(cgl, dontTransform, dontDrawMesh, ignoreMaterial, ignoreChilds, drawHidden, _time);

        if (!dontTransform)cgl.popModelMatrix();
    }
};
let tab = null;

function closeTab()
{
    if (tab)gui.mainTabs.closeTab(tab.id);
    tab = null;
}

function formatVec(arr)
{
    const nums = [];
    for (let i = 0; i < arr.length; i++)
    {
        nums.push(Math.round(arr[i] * 1000) / 1000);
    }

    return nums.join(",");
}

function printNode(html, node, level)
{
    if (!gltf) return;

    html += "<tr class=\"row\">";

    let ident = "";
    let identSpace = "";

    for (let i = 1; i < level; i++)
    {
        identSpace += "&nbsp;&nbsp;&nbsp;";
        let identClass = "identBg";
        if (i == 1)identClass = "identBgLevel0";
        ident += "<td class=\"ident " + identClass + "\" ><div style=\"\"></div></td>";
    }
    let id = CABLES.uuid();
    html += ident;
    html += "<td colspan=\"" + (21 - level) + "\">";

    if (node.mesh && node.mesh.meshes.length)html += "<span class=\"icon icon-cube\"></span>&nbsp;";
    else html += "<span class=\"icon icon-box-select\"></span> &nbsp;";

    html += node.name + "</td><td></td>";

    if (node.mesh)
    {
        html += "<td>";
        for (let i = 0; i < node.mesh.meshes.length; i++)
        {
            if (i > 0)html += ", ";
            html += node.mesh.meshes[i].name;
        }

        html += "</td>";

        html += "<td>";
        html += node.hasSkin() || "-";
        html += "</td>";

        html += "<td>";
        let countMats = 0;
        for (let i = 0; i < node.mesh.meshes.length; i++)
        {
            if (countMats > 0)html += ", ";
            if (gltf.json.materials && node.mesh.meshes[i].hasOwnProperty("material"))
            {
                if (gltf.json.materials[node.mesh.meshes[i].material])
                {
                    html += gltf.json.materials[node.mesh.meshes[i].material].name;
                    countMats++;
                }
            }
        }
        if (countMats == 0)html += "none";
        html += "</td>";
    }
    else
    {
        html += "<td>-</td><td>-</td><td>-</td>";
    }

    html += "<td>";

    if (node._node.translation || node._node.rotation || node._node.scale)
    {
        let info = "";

        if (node._node.translation)info += "Translate: `" + formatVec(node._node.translation) + "` || ";
        if (node._node.rotation)info += "Rotation: `" + formatVec(node._node.rotation) + "` || ";
        if (node._node.scale)info += "Scale: `" + formatVec(node._node.scale) + "` || ";

        html += "<span class=\"icon icon-gizmo info\" data-info=\"" + info + "\"></span> &nbsp;";
    }

    if (node._animRot || node._animScale || node._animTrans)
    {
        let info = "Animated: ";
        if (node._animRot) info += "Rot ";
        if (node._animScale) info += "Scale ";
        if (node._animTrans) info += "Trans ";

        html += "<span class=\"icon icon-clock info\" data-info=\"" + info + "\"></span>&nbsp;";
    }

    if (!node._node.translation && !node._node.rotation && !node._node.scale && !node._animRot && !node._animScale && !node._animTrans) html += "-";

    html += "</td>";

    html += "<td>";
    let hideclass = "";
    if (node.hidden)hideclass = "node-hidden";

    // html+='';
    html += "<a onclick=\"gui.corePatch().getOpById('" + op.id + "').exposeNode('" + node.name + "','transform')\" class=\"treebutton\">Transform</a>";
    html += " <a onclick=\"gui.corePatch().getOpById('" + op.id + "').exposeNode('" + node.name + "','hierarchy')\" class=\"treebutton\">Hierarchy</a>";
    html += " <a onclick=\"gui.corePatch().getOpById('" + op.id + "').exposeNode('" + node.name + "')\" class=\"treebutton\">Node</a>";

    if (node.hasSkin())
        html += " <a onclick=\"gui.corePatch().getOpById('" + op.id + "').exposeNode('" + node.name + "',false,{skin:true});\" class=\"treebutton\">Skin</a>";

    html += "</td><td>";
    html += "&nbsp;<span class=\"icon iconhover icon-eye " + hideclass + "\" onclick=\"gui.corePatch().getOpById('" + op.id + "').toggleNodeVisibility('" + node.name + "');this.classList.toggle('node-hidden');\"></span>";
    html += "</td>";

    html += "</tr>";

    if (node.children)
    {
        for (let i = 0; i < node.children.length; i++)
            html = printNode(html, gltf.nodes[node.children[i]], level + 1);
    }

    return html;
}

function printMaterial(mat, idx)
{
    let html = "<tr>";
    html += " <td>" + idx + "</td>";
    html += " <td>" + mat.name + "</td>";

    html += " <td>";

    const info = JSON.stringify(mat, null, 4).replaceAll("\"", "").replaceAll("\n", "<br/>");

    html += "<span class=\"icon icon-info\" onclick=\"new CABLES.UI.ModalDialog({ 'html': '<pre>" + info + "</pre>', 'title': '" + mat.name + "' });\"></span>&nbsp;";

    if (mat.pbrMetallicRoughness && mat.pbrMetallicRoughness.baseColorFactor)
    {
        let rgb = "";
        rgb += "" + Math.round(mat.pbrMetallicRoughness.baseColorFactor[0] * 255);
        rgb += "," + Math.round(mat.pbrMetallicRoughness.baseColorFactor[1] * 255);
        rgb += "," + Math.round(mat.pbrMetallicRoughness.baseColorFactor[2] * 255);

        html += "<div style=\"width:15px;height:15px;background-color:rgb(" + rgb + ");display:inline-block\">&nbsp;</a>";
    }
    html += " <td style=\"\">" + (gltf.shaders[idx] ? "-" : "<a onclick=\"gui.corePatch().getOpById('" + op.id + "').assignMaterial('" + mat.name + "')\" class=\"treebutton\">Assign</a>") + "<td>";
    html += "<td>";

    html += "</tr>";
    return html;
}

function printInfo()
{
    if (!gltf) return;

    const startTime = performance.now();
    const sizes = {};
    let html = "<div style=\"overflow:scroll;width:100%;height:100%\">";

    html += "File: <a href=\"" + CABLES.platform.getCablesUrl() + "/asset/patches/?filename=" + inFile.get() + "\" target=\"_blank\">" + CABLES.basename(inFile.get()) + "</a><br/>";

    html += "Generator:" + gltf.json.asset.generator;

    let numNodes = 0;
    if (gltf.json.nodes)numNodes = gltf.json.nodes.length;
    html += "<div id=\"groupNodes\">Nodes (" + numNodes + ")</div>";

    html += "<table id=\"sectionNodes\" class=\"table treetable\">";

    html += "<tr>";
    html += " <th colspan=\"21\">Name</th>";
    html += " <th>Mesh</th>";
    html += " <th>Skin</th>";
    html += " <th>Material</th>";
    html += " <th>Transform</th>";
    html += " <th>Expose</th>";
    html += " <th></th>";
    html += "</tr>";

    for (let i = 0; i < gltf.nodes.length; i++)
    {
        if (!gltf.nodes[i].isChild)
            html = printNode(html, gltf.nodes[i], 1);
    }
    html += "</table>";

    // / //////////////////

    let numMaterials = 0;
    if (gltf.json.materials)numMaterials = gltf.json.materials.length;
    html += "<div id=\"groupMaterials\">Materials (" + numMaterials + ")</div>";

    if (!gltf.json.materials || gltf.json.materials.length == 0)
    {
    }
    else
    {
        html += "<table id=\"materialtable\"  class=\"table treetable\">";
        html += "<tr>";
        html += " <th>Index</th>";
        html += " <th>Name</th>";
        html += " <th>Color</th>";
        html += " <th>Function</th>";
        html += " <th></th>";
        html += "</tr>";
        for (let i = 0; i < gltf.json.materials.length; i++)
        {
            html += printMaterial(gltf.json.materials[i], i);
        }
        html += "</table>";
    }

    // / ///////////////////////

    html += "<div id=\"groupMeshes\">Meshes (" + gltf.json.meshes.length + ")</div>";

    html += "<table id=\"meshestable\"  class=\"table treetable\">";
    html += "<tr>";
    html += " <th>Name</th>";
    html += " <th>Node</th>";
    html += " <th>Material</th>";
    html += " <th>Vertices</th>";
    html += " <th>Attributes</th>";
    html += "</tr>";

    let sizeBufferViews = [];
    sizes.meshes = 0;
    sizes.meshTargets = 0;

    for (let i = 0; i < gltf.json.meshes.length; i++)
    {
        html += "<tr>";
        html += "<td>" + gltf.json.meshes[i].name + "</td>";

        html += "<td>";
        let count = 0;
        let nodename = "";
        if (gltf.json.nodes)
            for (let j = 0; j < gltf.json.nodes.length; j++)
            {
                if (gltf.json.nodes[j].mesh == i)
                {
                    count++;
                    if (count == 1)
                    {
                        nodename = gltf.json.nodes[j].name;
                    }
                }
            }
        if (count > 1) html += (count) + " nodes (" + nodename + " ...)";
        else html += nodename;
        html += "</td>";

        // -------

        html += "<td>";
        for (let j = 0; j < gltf.json.meshes[i].primitives.length; j++)
        {
            if (gltf.json.meshes[i].primitives[j].hasOwnProperty("material"))
            {
                if (gltf.json.materials[gltf.json.meshes[i]])
                {
                    html += gltf.json.materials[gltf.json.meshes[i].primitives[j].material].name + " ";
                }
            }
            else html += "None";
        }
        html += "</td>";

        html += "<td>";
        let numVerts = 0;
        for (let j = 0; j < gltf.json.meshes[i].primitives.length; j++)
        {
            if (gltf.json.meshes[i].primitives[j].attributes.POSITION != undefined)
            {
                let v = parseInt(gltf.json.accessors[gltf.json.meshes[i].primitives[j].attributes.POSITION].count);
                numVerts += v;
                html += "" + v + "<br/>";
            }
            else html += "-<br/>";
        }

        if (gltf.json.meshes[i].primitives.length > 1)
            html += "=" + numVerts;
        html += "</td>";

        html += "<td>";
        for (let j = 0; j < gltf.json.meshes[i].primitives.length; j++)
        {
            html += Object.keys(gltf.json.meshes[i].primitives[j].attributes);
            html += " <a onclick=\"gui.corePatch().getOpById('" + op.id + "').exposeGeom('" + gltf.json.meshes[i].name + "'," + j + ")\" class=\"treebutton\">Geometry</a>";
            html += "<br/>";

            if (gltf.json.meshes[i].primitives[j].targets)
            {
                html += gltf.json.meshes[i].primitives[j].targets.length + " targets<br/>";

                if (gltf.json.meshes[i].extras && gltf.json.meshes[i].extras.targetNames)
                    html += "Targetnames:<br/>" + gltf.json.meshes[i].extras.targetNames.join("<br/>");

                html += "<br/>";
            }
        }

        html += "</td>";
        html += "</tr>";

        for (let j = 0; j < gltf.json.meshes[i].primitives.length; j++)
        {
            const accessor = gltf.json.accessors[gltf.json.meshes[i].primitives[j].indices];
            if (accessor)
            {
                let bufView = accessor.bufferView;

                if (sizeBufferViews.indexOf(bufView) == -1)
                {
                    sizeBufferViews.push(bufView);
                    if (gltf.json.bufferViews[bufView])sizes.meshes += gltf.json.bufferViews[bufView].byteLength;
                }
            }

            for (let k in gltf.json.meshes[i].primitives[j].attributes)
            {
                const attr = gltf.json.meshes[i].primitives[j].attributes[k];
                const bufView2 = gltf.json.accessors[attr].bufferView;

                if (sizeBufferViews.indexOf(bufView2) == -1)
                {
                    sizeBufferViews.push(bufView2);
                    if (gltf.json.bufferViews[bufView2])sizes.meshes += gltf.json.bufferViews[bufView2].byteLength;
                }
            }

            if (gltf.json.meshes[i].primitives[j].targets)
                for (let k = 0; k < gltf.json.meshes[i].primitives[j].targets.length; k++)
                {
                    for (let l in gltf.json.meshes[i].primitives[j].targets[k])
                    {
                        const accessorIdx = gltf.json.meshes[i].primitives[j].targets[k][l];
                        const accessor = gltf.json.accessors[accessorIdx];
                        const bufView2 = accessor.bufferView;
                        console.log("accessor", accessor);
                        if (sizeBufferViews.indexOf(bufView2) == -1)
                            if (gltf.json.bufferViews[bufView2])
                            {
                                sizeBufferViews.push(bufView2);
                                sizes.meshTargets += gltf.json.bufferViews[bufView2].byteLength;
                            }
                    }
                }
        }
    }
    html += "</table>";

    // / //////////////////////////////////

    let numSamplers = 0;
    let numAnims = 0;
    let numKeyframes = 0;

    if (gltf.json.animations)
    {
        numAnims = gltf.json.animations.length;
        for (let i = 0; i < gltf.json.animations.length; i++)
        {
            numSamplers += gltf.json.animations[i].samplers.length;
        }
    }

    html += "<div id=\"groupAnims\">Animations (" + numAnims + "/" + numSamplers + ")</div>";

    if (gltf.json.animations)
    {
        html += "<table id=\"sectionAnim\" class=\"table treetable\">";
        html += "<tr>";
        html += "  <th>Name</th>";
        html += "  <th>Target node</th>";
        html += "  <th>Path</th>";
        html += "  <th>Interpolation</th>";
        html += "  <th>Keys</th>";
        html += "</tr>";


        sizes.animations = 0;

        for (let i = 0; i < gltf.json.animations.length; i++)
        {
            for (let j = 0; j < gltf.json.animations[i].samplers.length; j++)
            {
                let bufView = gltf.json.accessors[gltf.json.animations[i].samplers[j].input].bufferView;
                if (sizeBufferViews.indexOf(bufView) == -1)
                {
                    sizeBufferViews.push(bufView);
                    sizes.animations += gltf.json.bufferViews[bufView].byteLength;
                }

                bufView = gltf.json.accessors[gltf.json.animations[i].samplers[j].output].bufferView;
                if (sizeBufferViews.indexOf(bufView) == -1)
                {
                    sizeBufferViews.push(bufView);
                    sizes.animations += gltf.json.bufferViews[bufView].byteLength;
                }
            }

            for (let j = 0; j < gltf.json.animations[i].channels.length; j++)
            {
                html += "<tr>";
                html += "  <td> Anim " + i + ": " + gltf.json.animations[i].name + "</td>";

                html += "  <td>" + gltf.nodes[gltf.json.animations[i].channels[j].target.node].name + "</td>";
                html += "  <td>";
                html += gltf.json.animations[i].channels[j].target.path + " ";
                html += "  </td>";

                const smplidx = gltf.json.animations[i].channels[j].sampler;
                const smplr = gltf.json.animations[i].samplers[smplidx];

                html += "  <td>" + smplr.interpolation + "</td>";

                html += "  <td>" + gltf.json.accessors[smplr.output].count;
                numKeyframes += gltf.json.accessors[smplr.output].count;

                // html += "&nbsp;&nbsp;<a onclick=\"gui.corePatch().getOpById('" + op.id + "').showAnim('" + i + "','" + j + "')\" class=\"icon icon-search\"></a>";

                html += "</td>";

                html += "</tr>";
            }
        }

        html += "<tr>";
        html += "  <td></td>";
        html += "  <td></td>";
        html += "  <td></td>";
        html += "  <td></td>";
        html += "  <td>" + numKeyframes + " total</td>";
        html += "</tr>";
        html += "</table>";
    }
    else
    {

    }

    // / ///////////////////

    let numImages = 0;
    if (gltf.json.images)numImages = gltf.json.images.length;
    html += "<div id=\"groupImages\">Images (" + numImages + ")</div>";

    if (gltf.json.images)
    {
        html += "<table id=\"sectionImages\" class=\"table treetable\">";

        html += "<tr>";
        html += "  <th>name</th>";
        html += "  <th>type</th>";
        html += "  <th>func</th>";
        html += "</tr>";

        sizes.images = 0;

        for (let i = 0; i < gltf.json.images.length; i++)
        {
            if (gltf.json.images[i].hasOwnProperty("bufferView"))
            {
                // if (sizeBufferViews.indexOf(gltf.json.images[i].hasOwnProperty("bufferView")) == -1)console.log("image bufferview already there?!");
                // else
                sizes.images += gltf.json.bufferViews[gltf.json.images[i].bufferView].byteLength;
            }
            else console.log("image has no bufferview?!");

            html += "<tr>";
            html += "<td>" + gltf.json.images[i].name + "</td>";
            html += "<td>" + gltf.json.images[i].mimeType + "</td>";
            html += "<td>";

            let name = gltf.json.images[i].name;
            if (name === undefined)name = gltf.json.images[i].bufferView;

            html += "<a onclick=\"gui.corePatch().getOpById('" + op.id + "').exposeTexture('" + name + "')\" class=\"treebutton\">Expose</a>";
            html += "</td>";

            html += "<tr>";
        }
        html += "</table>";
    }

    // / ///////////////////////

    let numCameras = 0;
    if (gltf.json.cameras)numCameras = gltf.json.cameras.length;
    html += "<div id=\"groupCameras\">Cameras (" + numCameras + ")</div>";

    if (gltf.json.cameras)
    {
        html += "<table id=\"sectionCameras\" class=\"table treetable\">";

        html += "<tr>";
        html += "  <th>name</th>";
        html += "  <th>type</th>";
        html += "  <th>info</th>";
        html += "</tr>";

        for (let i = 0; i < gltf.json.cameras.length; i++)
        {
            html += "<tr>";
            html += "<td>" + gltf.json.cameras[i].name + "</td>";
            html += "<td>" + gltf.json.cameras[i].type + "</td>";
            html += "<td>";

            if (gltf.json.cameras[i].perspective)
            {
                html += "yfov: " + Math.round(gltf.json.cameras[i].perspective.yfov * 100) / 100;
                html += ", ";
                html += "zfar: " + Math.round(gltf.json.cameras[i].perspective.zfar * 100) / 100;
                html += ", ";
                html += "znear: " + Math.round(gltf.json.cameras[i].perspective.znear * 100) / 100;
            }
            html += "</td>";

            html += "<tr>";
        }
        html += "</table>";
    }

    // / ////////////////////////////////////

    let numSkins = 0;
    if (gltf.json.skins)numSkins = gltf.json.skins.length;
    html += "<div id=\"groupSkins\">Skins (" + numSkins + ")</div>";

    if (gltf.json.skins)
    {
        // html += "<h3>Skins (" + gltf.json.skins.length + ")</h3>";
        html += "<table id=\"sectionSkins\" class=\"table treetable\">";

        html += "<tr>";
        html += "  <th>name</th>";
        html += "  <th></th>";
        html += "  <th>total joints</th>";
        html += "</tr>";

        for (let i = 0; i < gltf.json.skins.length; i++)
        {
            html += "<tr>";
            html += "<td>" + gltf.json.skins[i].name + "</td>";
            html += "<td>" + "</td>";
            html += "<td>" + gltf.json.skins[i].joints.length + "</td>";
            html += "<td>";
            html += "</td>";
            html += "<tr>";
        }
        html += "</table>";
    }

    // / ////////////////////////////////////

    if (gltf.timing)
    {
        html += "<div id=\"groupTiming\">Debug Loading Timing </div>";

        html += "<table id=\"sectionTiming\" class=\"table treetable\">";

        html += "<tr>";
        html += "  <th>task</th>";
        html += "  <th>time used</th>";
        html += "</tr>";

        let lt = 0;
        for (let i = 0; i < gltf.timing.length - 1; i++)
        {
            html += "<tr>";
            html += "  <td>" + gltf.timing[i][0] + "</td>";
            html += "  <td>" + (gltf.timing[i + 1][1] - gltf.timing[i][1]) + " ms</td>";
            html += "</tr>";
            // lt = gltf.timing[i][1];
        }
        html += "</table>";
    }

    // / //////////////////////////

    let sizeBin = 0;
    if (gltf.json.buffers)
        sizeBin = gltf.json.buffers[0].byteLength;

    html += "<div id=\"groupBinary\">File Size Allocation (" + Math.round(sizeBin / 1024) + "k )</div>";

    html += "<table id=\"sectionBinary\" class=\"table treetable\">";
    html += "<tr>";
    html += "  <th>name</th>";
    html += "  <th>size</th>";
    html += "  <th>%</th>";
    html += "</tr>";
    let sizeUnknown = sizeBin;
    for (let i in sizes)
    {
        // html+=i+':'+Math.round(sizes[i]/1024);
        html += "<tr>";
        html += "<td>" + i + "</td>";
        html += "<td>" + readableSize(sizes[i]) + " </td>";
        html += "<td>" + Math.round(sizes[i] / sizeBin * 100) + "% </td>";
        html += "<tr>";
        sizeUnknown -= sizes[i];
    }

    if (sizeUnknown != 0)
    {
        html += "<tr>";
        html += "<td>unknown</td>";
        html += "<td>" + readableSize(sizeUnknown) + " </td>";
        html += "<td>" + Math.round(sizeUnknown / sizeBin * 100) + "% </td>";
        html += "<tr>";
    }

    html += "</table>";
    html += "</div>";

    tab = new CABLES.UI.Tab("GLTF " + CABLES.basename(inFile.get()), { "icon": "cube", "infotext": "tab_gltf", "padding": true, "singleton": true });
    gui.mainTabs.addTab(tab, true);

    tab.addEventListener("close", closeTab);
    tab.html(html);

    CABLES.UI.Collapsable.setup(ele.byId("groupNodes"), ele.byId("sectionNodes"), false);
    CABLES.UI.Collapsable.setup(ele.byId("groupMaterials"), ele.byId("materialtable"), true);
    CABLES.UI.Collapsable.setup(ele.byId("groupAnims"), ele.byId("sectionAnim"), true);
    CABLES.UI.Collapsable.setup(ele.byId("groupMeshes"), ele.byId("meshestable"), true);
    CABLES.UI.Collapsable.setup(ele.byId("groupCameras"), ele.byId("sectionCameras"), true);
    CABLES.UI.Collapsable.setup(ele.byId("groupImages"), ele.byId("sectionImages"), true);
    CABLES.UI.Collapsable.setup(ele.byId("groupSkins"), ele.byId("sectionSkins"), true);
    CABLES.UI.Collapsable.setup(ele.byId("groupBinary"), ele.byId("sectionBinary"), true);
    CABLES.UI.Collapsable.setup(ele.byId("groupTiming"), ele.byId("sectionTiming"), true);

    gui.maintabPanel.show(true);
}

function readableSize(n)
{
    if (n > 1024) return Math.round(n / 1024) + " kb";
    if (n > 1024 * 500) return Math.round(n / 1024) + " mb";
    else return n + " bytes";
}
const GltfSkin = class
{
    constructor(node)
    {
        this._mod = null;
        this._node = node;
        this._lastTime = 0;
        this._matArr = [];
        this._m = mat4.create();
        this._invBindMatrix = mat4.create();
        this.identity = true;
    }

    renderFinish(cgl)
    {
        cgl.popModelMatrix();
        this._mod.unbind();
    }

    renderStart(cgl, time)
    {
        if (!this._mod)
        {
            this._mod = new CGL.ShaderModifier(cgl, op.name + this._node.name);

            this._mod.addModule({
                "priority": -2,
                "name": "MODULE_VERTEX_POSITION",
                "srcHeadVert": attachments.skin_head_vert || "",
                "srcBodyVert": attachments.skin_vert || ""
            });

            this._mod.addUniformVert("m4[]", "MOD_boneMats", []);// bohnenmatze
            const tr = vec3.create();
        }

        const skinIdx = this._node.skin;
        const arrLength = gltf.json.skins[skinIdx].joints.length * 16;

        // if (this._lastTime != time || !time)
        {
            // this._lastTime=inTime.get();
            if (this._matArr.length != arrLength) this._matArr.length = arrLength;

            for (let i = 0; i < gltf.json.skins[skinIdx].joints.length; i++)
            {
                const i16 = i * 16;
                const jointIdx = gltf.json.skins[skinIdx].joints[i];
                const nodeJoint = gltf.nodes[jointIdx];

                for (let j = 0; j < 16; j++)
                    this._invBindMatrix[j] = gltf.accBuffers[gltf.json.skins[skinIdx].inverseBindMatrices][i16 + j];

                mat4.mul(this._m, nodeJoint.modelMatAbs(), this._invBindMatrix);

                for (let j = 0; j < this._m.length; j++) this._matArr[i16 + j] = this._m[j];
            }

            this._mod.setUniformValue("MOD_boneMats", this._matArr);
            this._lastTime = time;
        }

        this._mod.define("SKIN_NUM_BONES", gltf.json.skins[skinIdx].joints.length);
        this._mod.bind();

        // draw mesh...
        cgl.pushModelMatrix();
        if (this.identity)mat4.identity(cgl.mMatrix);
    }
};
const GltfTargetsRenderer = class
{
    constructor(mesh)
    {
        this.mesh = mesh;
        this.tex = null;
        this.numRowsPerTarget = 0;

        this.makeTex(mesh.geom);
    }

    renderFinish(cgl)
    {
        if (!cgl.gl) return;
        cgl.popModelMatrix();
        this._mod.unbind();
    }

    renderStart(cgl, time)
    {
        if (!cgl.gl) return;
        if (!this._mod)
        {
            this._mod = new CGL.ShaderModifier(cgl, "gltftarget");

            this._mod.addModule({
                "priority": -2,
                "name": "MODULE_VERTEX_POSITION",
                "srcHeadVert": attachments.targets_head_vert || "",
                "srcBodyVert": attachments.targets_vert || ""
            });

            this._mod.addUniformVert("4f", "MOD_targetTexInfo", [0, 0, 0, 0]);
            this._mod.addUniformVert("t", "MOD_targetTex", 1);
            this._mod.addUniformVert("f[]", "MOD_weights", []);

            const tr = vec3.create();
        }

        this._mod.pushTexture("MOD_targetTex", this.tex);
        if (this.tex && this.mesh.weights)
        {
            this._mod.setUniformValue("MOD_weights", this.mesh.weights);
            this._mod.setUniformValue("MOD_targetTexInfo", [this.tex.width, this.tex.height, this.numRowsPerTarget, this.mesh.weights.length]);

            this._mod.define("MOD_NUM_WEIGHTS", Math.max(1, this.mesh.weights.length));
        }
        else
        {
            this._mod.define("MOD_NUM_WEIGHTS", 1);
        }
        this._mod.bind();

        // draw mesh...
        cgl.pushModelMatrix();
        if (this.identity)mat4.identity(cgl.mMatrix);
    }

    makeTex(geom)
    {
        if (!cgl.gl) return;

        if (!geom.morphTargets || !geom.morphTargets.length) return;

        let w = geom.morphTargets[0].vertices.length / 3;
        let h = 0;
        this.numRowsPerTarget = 0;

        if (geom.morphTargets[0].vertices && geom.morphTargets[0].vertices.length) this.numRowsPerTarget++;
        if (geom.morphTargets[0].vertexNormals && geom.morphTargets[0].vertexNormals.length) this.numRowsPerTarget++;
        if (geom.morphTargets[0].tangents && geom.morphTargets[0].tangents.length) this.numRowsPerTarget++;
        if (geom.morphTargets[0].bitangents && geom.morphTargets[0].bitangents.length) this.numRowsPerTarget++;

        h = geom.morphTargets.length * this.numRowsPerTarget;

        // console.log("this.numRowsPerTarget", this.numRowsPerTarget);

        const pixels = new Float32Array(w * h * 4);
        let row = 0;

        for (let i = 0; i < geom.morphTargets.length; i++)
        {
            if (geom.morphTargets[i].vertices && geom.morphTargets[i].vertices.length)
            {
                for (let j = 0; j < geom.morphTargets[i].vertices.length; j += 3)
                {
                    pixels[((row * w) + (j / 3)) * 4 + 0] = geom.morphTargets[i].vertices[j + 0];
                    pixels[((row * w) + (j / 3)) * 4 + 1] = geom.morphTargets[i].vertices[j + 1];
                    pixels[((row * w) + (j / 3)) * 4 + 2] = geom.morphTargets[i].vertices[j + 2];
                    pixels[((row * w) + (j / 3)) * 4 + 3] = 1;
                }
                row++;
            }

            if (geom.morphTargets[i].vertexNormals && geom.morphTargets[i].vertexNormals.length)
            {
                for (let j = 0; j < geom.morphTargets[i].vertexNormals.length; j += 3)
                {
                    pixels[(row * w + j / 3) * 4 + 0] = geom.morphTargets[i].vertexNormals[j + 0];
                    pixels[(row * w + j / 3) * 4 + 1] = geom.morphTargets[i].vertexNormals[j + 1];
                    pixels[(row * w + j / 3) * 4 + 2] = geom.morphTargets[i].vertexNormals[j + 2];
                    pixels[(row * w + j / 3) * 4 + 3] = 1;
                }

                row++;
            }

            if (geom.morphTargets[i].tangents && geom.morphTargets[i].tangents.length)
            {
                for (let j = 0; j < geom.morphTargets[i].tangents.length; j += 3)
                {
                    pixels[(row * w + j / 3) * 4 + 0] = geom.morphTargets[i].tangents[j + 0];
                    pixels[(row * w + j / 3) * 4 + 1] = geom.morphTargets[i].tangents[j + 1];
                    pixels[(row * w + j / 3) * 4 + 2] = geom.morphTargets[i].tangents[j + 2];
                    pixels[(row * w + j / 3) * 4 + 3] = 1;
                }
                row++;
            }

            if (geom.morphTargets[i].bitangents && geom.morphTargets[i].bitangents.length)
            {
                for (let j = 0; j < geom.morphTargets[i].bitangents.length; j += 3)
                {
                    pixels[(row * w + j / 3) * 4 + 0] = geom.morphTargets[i].bitangents[j + 0];
                    pixels[(row * w + j / 3) * 4 + 1] = geom.morphTargets[i].bitangents[j + 1];
                    pixels[(row * w + j / 3) * 4 + 2] = geom.morphTargets[i].bitangents[j + 2];
                    pixels[(row * w + j / 3) * 4 + 3] = 1;
                }
                row++;
            }
        }

        this.tex = new CGL.Texture(cgl, { "isFloatingPointTexture": true, "name": "targetsTexture" });

        this.tex.initFromData(pixels, w, h, CGL.Texture.FILTER_LINEAR, CGL.Texture.WRAP_REPEAT);

        // console.log("morphTargets generated texture", w, h);
    }
};
// https://raw.githubusercontent.com/KhronosGroup/glTF/master/specification/2.0/figures/gltfOverview-2.0.0b.png

const
    inExec = op.inTrigger("Render"),
    dataPort = op.inString("data"),
    inFile = op.inUrl("glb File", [".glb"]),
    inRender = op.inBool("Draw", true),
    inCamera = op.inDropDown("Camera", ["None"], "None"),
    inAnimation = op.inString("Animation", ""),
    inShow = op.inTriggerButton("Show Structure"),
    inCenter = op.inSwitch("Center", ["None", "XYZ", "XZ"], "XYZ"),
    inRescale = op.inBool("Rescale", true),
    inRescaleSize = op.inFloat("Rescale Size", 2.5),

    inTime = op.inFloat("Time"),
    inTimeLine = op.inBool("Sync to timeline", false),
    inLoop = op.inBool("Loop", true),

    inNormFormat = op.inSwitch("Normals Format", ["XYZ", "X-ZY"], "XYZ"),
    inVertFormat = op.inSwitch("Vertices Format", ["XYZ", "XZ-Y"], "XYZ"),
    inCalcNormals = op.inSwitch("Calc Normals", ["Auto", "Force Smooth", "Never"], "Auto"),

    inMaterials = op.inObject("Materials"),
    inHideNodes = op.inArray("Hide Nodes"),
    inUseMatProps = op.inBool("Use Material Properties", false),

    inActive = op.inBool("Active", true),

    nextBefore = op.outTrigger("Render Before"),
    next = op.outTrigger("Next"),
    outGenerator = op.outString("Generator"),

    outVersion = op.outNumber("GLTF Version"),
    outExtensions = op.outArray("GLTF Extensions Used"),
    outAnimLength = op.outNumber("Anim Length", 0),
    outAnimTime = op.outNumber("Anim Time", 0),
    outJson = op.outObject("Json"),
    outAnims = op.outArray("Anims"),
    outPoints = op.outArray("BoundingPoints"),
    outBounds = op.outObject("Bounds"),
    outAnimFinished = op.outTrigger("Finished"),
    outLoading = op.outBool("Loading");

op.setPortGroup("Timing", [inTime, inTimeLine, inLoop]);

let cgl = op.patch.cg || op.patch.cgl;
let gltfLoadingErrorMesh = null;
let gltfLoadingError = false;
let gltfTransforms = 0;
let finishedLoading = false;
let cam = null;
let boundingPoints = [];
let gltf = null;
let maxTime = 0;
let time = 0;
let needsMatUpdate = true;
let timedLoader = null;
let loadingId = null;
let data = null;
const scale = vec3.create();
let lastTime = 0;
let doCenter = false;
const boundsCenter = vec3.create();

inFile.onChange =
    inVertFormat.onChange =
    inCalcNormals.onChange =
    inNormFormat.onChange = reloadSoon;

inShow.onTriggered = printInfo;
dataPort.onChange = loadData;
inHideNodes.onChange = hideNodesFromData;
inAnimation.onChange = updateAnimation;
inCenter.onChange = updateCenter;
op.toWorkPortsNeedToBeLinked(inExec);

dataPort.setUiAttribs({ "hideParam": true, "hidePort": true });
op.setPortGroup("Transform", [inRescale, inRescaleSize, inCenter]);

function updateCamera()
{
    const arr = ["None"];
    if (gltf)
    {
        for (let i = 0; i < gltf.nodes.length; i++)
        {
            if (gltf.nodes[i].camera >= 0)
            {
                arr.push(gltf.nodes[i].name);
            }
        }
    }
    inCamera.uiAttribs.values = arr;
}

function updateCenter()
{
    doCenter = inCenter.get() != "None";

    if (gltf && gltf.bounds)
    {
        boundsCenter.set(gltf.bounds.center);
        boundsCenter[0] = -boundsCenter[0];
        boundsCenter[1] = -boundsCenter[1];
        boundsCenter[2] = -boundsCenter[2];
        if (inCenter.get() == "XZ") boundsCenter[1] = -gltf.bounds.minY;
    }
}

inRescale.onChange = function ()
{
    inRescaleSize.setUiAttribs({ "greyout": !inRescale.get() });
};

inMaterials.onChange = function ()
{
    needsMatUpdate = true;
};

op.onDelete = function ()
{
    closeTab();
};

inTimeLine.onChange = function ()
{
    inTime.setUiAttribs({ "greyout": inTimeLine.get() });
};

inCamera.onChange = setCam;

function setCam()
{
    cam = null;
    if (!gltf) return;

    for (let i = 0; i < gltf.nodes.length; i++)
    {
        if (gltf.nodes[i].name == inCamera.get())cam = new gltfCamera(gltf, gltf.nodes[i]);
    }
}

inExec.onTriggered = function ()
{
    cgl = op.patch.cg || op.patch.cgl;

    if (!finishedLoading) return;
    if (!inActive.get()) return;

    if (gltfLoadingError)
    {
        if (!gltfLoadingErrorMesh) gltfLoadingErrorMesh = CGL.MESHES.getSimpleCube(cgl, "ErrorCube");
        gltfLoadingErrorMesh.render(cgl.getShader());
    }

    gltfTransforms = 0;
    if (inTimeLine.get()) time = op.patch.timer.getTime();
    else time = Math.max(0, inTime.get());

    if (inLoop.get())
    {
        time %= maxTime;
        if (time < lastTime) outAnimFinished.trigger();
    }
    else
    {
        if (maxTime > 0 && time >= maxTime) outAnimFinished.trigger();
    }

    lastTime = time;

    cgl.pushModelMatrix();

    outAnimTime.set(time || 0);

    if (finishedLoading && gltf && gltf.bounds)
    {
        if (inRescale.get())
        {
            let sc = inRescaleSize.get() / gltf.bounds.maxAxis;
            gltf.scale = sc;
            vec3.set(scale, sc, sc, sc);
            mat4.scale(cgl.mMatrix, cgl.mMatrix, scale);
        }
        if (doCenter)
        {
            mat4.translate(cgl.mMatrix, cgl.mMatrix, boundsCenter);
        }
    }

    let oldScene = cgl.tempData.currentScene || null;
    cgl.tempData.currentScene = gltf;

    nextBefore.trigger();

    if (finishedLoading)
    {
        if (needsMatUpdate) updateMaterials();

        if (cam) cam.start(time);

        if (gltf)
        {
            gltf.time = time;

            if (gltf.bounds && cgl.shouldDrawHelpers(op))
            {
                if (op.isCurrentUiOp()) cgl.pushShader(CABLES.GL_MARKER.getSelectedShader(cgl));
                else cgl.pushShader(CABLES.GL_MARKER.getDefaultShader(cgl));

                gltf.bounds.render(cgl, null, op);
                cgl.popShader();
            }

            if (inRender.get())
            {
                for (let i = 0; i < gltf.nodes.length; i++)
                    if (!gltf.nodes[i].isChild)
                        gltf.nodes[i].render(cgl);
            }
            else
            {
                for (let i = 0; i < gltf.nodes.length; i++)
                    if (!gltf.nodes[i].isChild)
                        gltf.nodes[i].render(cgl, false, true);
            }
        }
    }

    next.trigger();
    cgl.tempData.currentScene = oldScene;

    cgl.popModelMatrix();

    if (cam)cam.end();
};

function finishLoading()
{
    if (!gltf)
    {
        finishedLoading = true;
        gltfLoadingError = true;
        cgl.patch.loading.finished(loadingId);

        op.setUiError("nogltf", "GLTF File not found");
        return;
    }

    op.setUiError("nogltf", null);

    if (gltf.loadingMeshes > 0)
    {
        // op.log("waiting for async meshes...");
        setTimeout(finishLoading, 100);
        return;
    }

    gltf.timing.push(["finishLoading()", Math.round((performance.now() - gltf.startTime))]);

    needsMatUpdate = true;
    // op.refreshParams();
    outAnimLength.set(maxTime);

    gltf.bounds = new CABLES.CG.BoundingBox();
    // gltf.bounds.applyPos(0, 0, 0);

    // if (!gltf)op.setUiError("urlerror", "could not load gltf:<br/>\"" + inFile.get() + "\"", 2);
    // else op.setUiError("urlerror", null);

    gltf.timing.push(["start calc bounds", Math.round((performance.now() - gltf.startTime))]);

    for (let i = 0; i < gltf.nodes.length; i++)
    {
        const node = gltf.nodes[i];
        node.updateMatrix();
        if (!node.isChild) node.calcBounds(gltf, null, gltf.bounds);
    }

    if (gltf.bounds)outBounds.set(gltf.bounds);

    gltf.timing.push(["calced bounds", Math.round((performance.now() - gltf.startTime))]);

    hideNodesFromData();

    gltf.timing.push(["hideNodesFromData", Math.round((performance.now() - gltf.startTime))]);

    if (tab)printInfo();

    gltf.timing.push(["printinfo", Math.round((performance.now() - gltf.startTime))]);

    updateCamera();
    setCam();
    outPoints.set(boundingPoints);

    if (gltf)
    {
        if (inFile.get() && !inFile.get().startsWith("data:"))
        {
            op.setUiAttrib({ "extendTitle": CABLES.basename(inFile.get()) });
        }

        gltf.loaded = Date.now();
        // if (gltf.bounds)outBounds.set(gltf.bounds);
    }

    if (gltf)
    {
        for (let i = 0; i < gltf.nodes.length; i++)
        {
            if (!gltf.nodes[i].isChild)
            {
                gltf.nodes[i].render(cgl, false, true, true, false, true, 0);
            }
        }

        for (let i = 0; i < gltf.nodes.length; i++)
        {
            const node = gltf.nodes[i];
            node.children = CABLES.uniqueArray(node.children); // stupid fix why are there too many children ?!
        }
    }

    updateCenter();
    updateAnimation();

    outLoading.set(false);

    cgl.patch.loading.finished(loadingId);
    loadingId = null;

    // if (gltf.chunks.length > 1) gltf.chunks[1] = null;
    // if (gltf.chunks.length > 2) gltf.chunks[2] = null;

    // op.setUiAttrib({ "accBuffersDelete": CABLES.basename(inFile.get()) });

    if (gltf.accBuffersDelete)
    {
        for (let i = 0; i < gltf.accBuffersDelete.length; i++)
        {
            gltf.accBuffers[gltf.accBuffersDelete[i]] = null;
        }
    }

    // setTimeout(() =>
    // {
    //     for (let i = 0; i < gltf.nodes.length; i++)
    //     {
    //     // console.log(gltf.nodes[i]);

    //         if (gltf.nodes[i].mesh && gltf.nodes[i].mesh.meshes)
    //         {
    //         // console.log(gltf.nodes[i].mesh.meshes.length);
    //             for (let j = 0; j < gltf.nodes[i].mesh.meshes.length; j++)
    //             {
    //                 console.log(gltf.nodes[i].mesh.meshes[j]);

    //                 // for (let k = 0; k < gltf.nodes[i].mesh.meshes.length; k++)
    //                 {
    //                     if (gltf.nodes[i].mesh.meshes[j].mesh)
    //                     {
    //                         gltf.nodes[i].mesh.meshes[j].mesh.freeMem();
    //                         // console.log(gltf.nodes[i].mesh.meshes[j].mesh);
    //                         // for (let l = 0; l < gltf.nodes[i].mesh.meshes[j].mesh._attributes.length; l++)
    //                         //     gltf.nodes[i].mesh.meshes[j].mesh._attributes[l] = null;
    //                     }
    //                 }

    //                 gltf.nodes[i].mesh.meshes[j].geom.clear();
    //                 console.log("clear!");
    //             }
    //         }
    //     }
    // }, 1000);

    if (!(gltf.json.images && gltf.json.images.length)) gltf.chunks = null;

    finishedLoading = true;
}

function loadBin(addCacheBuster)
{
    if (!inActive.get()) return;

    if (!loadingId)loadingId = cgl.patch.loading.start("gltfScene", inFile.get(), op);

    let fileToLoad = inFile.get();

    if (!fileToLoad || fileToLoad == "null") return;
    let url = op.patch.getFilePath(String(inFile.get()));
    if (!url) return;
    if (inFile.get() && !inFile.get().startsWith("data:"))
    {
        if (addCacheBuster === true)url += "?rnd=" + CABLES.generateUUID();
    }
    needsMatUpdate = true;
    outLoading.set(true);
    fetch(url)
        .then((res) => { return res.arrayBuffer(); })
        .then((arrayBuffer) =>
        {
            if (inFile.get() != fileToLoad)
            {
                cgl.patch.loading.finished(loadingId);
                loadingId = null;
                return;
            }

            boundingPoints = [];
            maxTime = 0;
            gltf = parseGltf(arrayBuffer);
            arrayBuffer = null;
            finishLoading();
        }).catch((e) =>
        {
            if (loadingId)cgl.patch.loading.finished(loadingId);
            loadingId = null;
            finishLoading();

            op.logError("gltf fetch error", e);
        });
    closeTab();

    const oReq = new XMLHttpRequest();
    oReq.open("GET", url, true);
    oReq.responseType = "arraybuffer";

    cgl.patch.loading.addAssetLoadingTask(() =>
    {

    });
}

// op.onFileChanged = function (fn)
// {
//     gltf.accBuffersDelete[i];
//     if (fn && fn.length > 3 && inFile.get() && inFile.get().indexOf(fn) > -1) reloadSoon(true);
// };

op.onFileChanged = function (fn)
{
    if (inFile.get() && inFile.get().indexOf(fn) > -1)
    {
        reloadSoon(true);
    }
};

inActive.onChange = () =>
{
    if (inActive.get()) reloadSoon();

    if (!inActive.get())
    {
        gltf = null;
    }
};

function reloadSoon(nocache)
{
    clearTimeout(timedLoader);
    timedLoader = setTimeout(function () { loadBin(nocache); }, 30);
}

function updateMaterials()
{
    if (!gltf) return;

    gltf.shaders = {};

    if (inMaterials.links.length == 1 && inMaterials.get())
    {
        // just accept a associative object with s
        needsMatUpdate = true;
        const op = inMaterials.links[0].portOut.op;

        const portShader = op.getPort("Shader");
        const portName = op.getPort("Material Name");

        if (!portShader && !portName)
        {
            const inMats = inMaterials.get();
            for (let matname in inMats)
            {
                if (inMats[matname] && gltf.json.materials)
                    for (let i = 0; i < gltf.json.materials.length; i++)
                    {
                        if (gltf.json.materials[i].name == matname)
                        {
                            if (gltf.shaders[i])
                            {
                                op.warn("double material assignment:", name);
                            }
                            gltf.shaders[i] = inMats[matname];
                        }
                    }
            }
        }
    }

    if (inMaterials.get())
    {
        for (let j = 0; j < inMaterials.links.length; j++)
        {
            const op = inMaterials.links[j].portOut.op;
            const portShader = op.getPort("Shader");
            const portName = op.getPort("Material Name");

            if (portShader && portName && portShader.get())
            {
                const name = portName.get();
                if (gltf.json.materials)
                    for (let i = 0; i < gltf.json.materials.length; i++)
                        if (gltf.json.materials[i].name == name)
                        {
                            if (gltf.shaders[i])
                            {
                                op.warn("double material assignment:", name);
                            }
                            gltf.shaders[i] = portShader.get();
                        }
            }
        }
    }
    needsMatUpdate = false;
    if (tab)printInfo();
}

function hideNodesFromArray()
{
    const hideArr = inHideNodes.get();

    if (!gltf || !data || !data.hiddenNodes) return;
    if (!hideArr)
    {
        return;
    }

    for (let i = 0; i < hideArr.length; i++)
    {
        const n = gltf.getNode(hideArr[i]);
        if (n)n.hidden = true;
    }
}

function hideNodesFromData()
{
    if (!data)loadData();
    if (!gltf) return;

    gltf.unHideAll();

    if (data && data.hiddenNodes)
    {
        for (const i in data.hiddenNodes)
        {
            const n = gltf.getNode(i);
            if (n) n.hidden = true;
            else op.verbose("node to be hidden not found", i, n);
        }
    }
    hideNodesFromArray();
}

function loadData()
{
    data = dataPort.get();

    if (!data || data === "")data = {};
    else data = JSON.parse(data);

    if (gltf)hideNodesFromData();

    return data;
}

function saveData()
{
    dataPort.set(JSON.stringify(data));
}

function updateAnimation()
{
    if (gltf && gltf.nodes)
    {
        for (let i = 0; i < gltf.nodes.length; i++)
        {
            gltf.nodes[i].setAnimAction(inAnimation.get());
        }
    }
}

function findParents(nodes, childNodeIndex)
{
    for (let i = 0; i < gltf.nodes.length; i++)
    {
        if (gltf.nodes[i].children.indexOf(childNodeIndex) >= 0)
        {
            nodes.push(gltf.nodes[i]);
            if (gltf.nodes[i].isChild) findParents(nodes, i);
        }
    }
}

op.exposeTexture = function (name)
{
    const newop = gui.corePatch().addOp("Ops.Gl.GLTF.GltfTexture");
    newop.getPort("Name").set(name);
    setNewOpPosition(newop, 1);
    op.patch.link(op, next.name, newop, "Render");
    gui.patchView.testCollision(newop);
    gui.patchView.centerSelectOp(newop.id, true);
};

op.exposeGeom = function (name, idx)
{
    const newop = gui.corePatch().addOp("Ops.Gl.GLTF.GltfGeometry");
    newop.getPort("Name").set(name);
    newop.getPort("Submesh").set(idx);
    setNewOpPosition(newop, 1);
    op.patch.link(op, next.name, newop, "Update");
    gui.patchView.testCollision(newop);
    gui.patchView.centerSelectOp(newop.id, true);
};

function setNewOpPosition(newOp, num)
{
    num = num || 1;

    newOp.setUiAttrib(
        {
            "subPatch": op.uiAttribs.subPatch,
            "translate": { "x": op.uiAttribs.translate.x, "y": op.uiAttribs.translate.y + num * CABLES.GLUI.glUiConfig.newOpDistanceY }
        });
}

op.exposeNode = function (name, type, options)
{
    let tree = type == "hierarchy";
    if (tree)
    {
        let ops = [];

        for (let i = 0; i < gltf.nodes.length; i++)
        {
            if (gltf.nodes[i].name == name)
            {
                let arrHierarchy = [];
                const node = gltf.nodes[i];
                findParents(arrHierarchy, i);

                arrHierarchy = arrHierarchy.reverse();
                arrHierarchy.push(node, node);

                let prevPort = next.name;
                let prevOp = op;
                for (let j = 0; j < arrHierarchy.length; j++)
                {
                    const newop = gui.corePatch().addOp("Ops.Gl.GLTF.GltfNode_v2");
                    newop.getPort("Node Name").set(arrHierarchy[j].name);
                    op.patch.link(prevOp, prevPort, newop, "Render");
                    setNewOpPosition(newop, j);

                    if (j == arrHierarchy.length - 1)
                    {
                        newop.getPort("Transformation").set(false);
                    }
                    else
                    {
                        newop.getPort("Draw Mesh").set(false);
                        newop.getPort("Draw Childs").set(false);
                    }

                    prevPort = "Next";
                    prevOp = newop;
                    ops.push(newop);
                    gui.patchView.testCollision(newop);
                }
            }
        }

        for (let i = 0; i < ops.length; i++)
        {
            ops[i].selectChilds();
        }
    }
    else
    {
        let newopname = "Ops.Gl.GLTF.GltfNode_v2";
        if (options && options.skin)newopname = "Ops.Gl.GLTF.GltfSkin";
        if (type == "transform")newopname = "Ops.Gl.GLTF.GltfNodeTransform_v2";

        gui.serverOps.loadOpLibs(newopname, () =>
        {
            let newop = gui.corePatch().addOp(newopname);

            newop.getPort("Node Name").set(name);
            setNewOpPosition(newop);
            op.patch.link(op, next.name, newop, "Render");
            gui.patchView.testCollision(newop);
            gui.patchView.centerSelectOp(newop.id, true);
        });
    }
    gui.closeModal();
};

op.assignMaterial = function (name)
{
    const newop = gui.corePatch().addOp("Ops.Gl.GLTF.GltfSetMaterial");
    newop.getPort("Material Name").set(name);
    op.patch.link(op, inMaterials.name, newop, "Material");
    setNewOpPosition(newop);
    gui.patchView.testCollision(newop);
    gui.patchView.centerSelectOp(newop.id, true);

    gui.closeModal();
};

op.toggleNodeVisibility = function (name)
{
    const n = gltf.getNode(name);
    n.hidden = !n.hidden;
    data.hiddenNodes = data.hiddenNodes || {};

    if (n)
        if (n.hidden)data.hiddenNodes[name] = true;
        else delete data.hiddenNodes[name];

    saveData();
};

}
};

CABLES.OPS["c9cbb226-46f7-4ca6-8dab-a9d0bdca4331"]={f:Ops.Gl.GLTF.GltfScene_v4,objName:"Ops.Gl.GLTF.GltfScene_v4"};




// **************************************************************
// 
// Ops.Extension.AmmoPhysics.AmmoDebugRenderer
// 
// **************************************************************

Ops.Extension.AmmoPhysics.AmmoDebugRenderer= class extends CABLES.Op 
{
constructor()
{
super(...arguments);
const op=this;
const attachments=op.attachments={};
const
    inRender = op.inTrigger("Render"),
    inDrawWireframe = op.inBool("Draw Wireframe", true),
    inDrawAABB = op.inBool("Draw AABB", false),
    inDrawContacts = op.inBool("Draw Contact Points", true),
    inDrawConstraints = op.inBool("Draw Constraints", false),

    inIgnClear = op.inBool("Depth", true),

    inActive = op.inBool("Active", true),

    outNext = op.outTrigger("Next");

op.setPortGroup("Options", [inDrawContacts, inDrawWireframe, inDrawAABB, inIgnClear]);

const cgl = op.patch.cgl;

let debugDrawer = null;
let oldWorld = null;

inRender.onTriggered = () =>
{
    if (cgl.frameStore.shadowPass) return outNext.trigger();

    const ammoWorld = cgl.frameStore.ammoWorld;
    if (!ammoWorld) return;

    if (!debugDrawer || oldWorld != ammoWorld.world)
    {
        debugDrawer = new CABLES.AmmoDebugDrawer(ammoWorld.world, { });
        debugDrawer.enable();
        oldWorld = ammoWorld.world;
    }

    if (!inActive.get())
    {
        outNext.trigger();
        return;
    }

    if (!ammoWorld) return;

    let debugmode = 0;
    if (inDrawWireframe.get())debugmode |= 1;
    if (inDrawAABB.get())debugmode |= 2;
    if (inDrawContacts.get())debugmode |= 8;
    if (inDrawConstraints.get())
    {
        debugmode |= 2048;
        debugmode |= 4096;
    }

    //       DrawConstraints: 1 << 11, //2048
    //   DrawConstraintLimits: 1 << 12, //4096
    //   FastWireframe: 1 << 13, //8192
    //   DrawNormals: 1 << 14, //16384

    outNext.trigger();

    debugmode |= 16384;

    if (debugmode)
    {
        cgl.pushModelMatrix();
        cgl.pushDepthTest(inIgnClear.get());
        cgl.pushDepthWrite(inIgnClear.get());

        mat4.identity(cgl.mMatrix);

        debugDrawer.setDebugMode(debugmode);
        debugDrawer.update();
        debugDrawer.render(cgl);
        // outPoints.set(debugDrawer.verts);

        cgl.popDepthTest();
        cgl.popDepthWrite();
        cgl.popModelMatrix();
    }
};

}
};

CABLES.OPS["e4b4f6c9-483b-486e-abbc-fbc4254a65d1"]={f:Ops.Extension.AmmoPhysics.AmmoDebugRenderer,objName:"Ops.Extension.AmmoPhysics.AmmoDebugRenderer"};




// **************************************************************
// 
// Ops.Extension.AmmoPhysics.AmmoCharacter
// 
// **************************************************************

Ops.Extension.AmmoPhysics.AmmoCharacter= class extends CABLES.Op 
{
constructor()
{
super(...arguments);
const op=this;
const attachments=op.attachments={};
const
    inExec = op.inTrigger("Update"),
    inRadius = op.inFloat("Radius", 1),
    inStyle = op.inSwitch("View", ["3rd Person", "1st Person"], "3rd Person"),
    // inSizeX = op.inFloat("Size X", 1),
    inSizeY = op.inFloat("Height", 2.04),
    // inSizeZ = op.inFloat("Size Z", 1),
    inMass = op.inFloat("Mass", 0),
    inName = op.inString("Name", ""),
    inActivate = op.inTriggerButton("Activate"),

    inMoveXP = op.inBool("Move X+", false),
    inMoveXM = op.inBool("Move X-", false),
    inMoveYP = op.inBool("Move Y+", false),
    inMoveYM = op.inBool("Move Y-", false),
    inMoveZP = op.inBool("Move Z+", false),
    inMoveZM = op.inBool("Move Z-", false),

    inDirX = op.inFloat("Dir X"),
    inDirY = op.inFloat("Dir Y"),
    inDirZ = op.inFloat("Dir Z"),

    inResetX = op.inFloat("Set Pos X"),
    inResetY = op.inFloat("Set Pos Y"),
    inResetZ = op.inFloat("Set Pos Z"),
    // inSetPos = op.inTriggerButton("Set Pos"),
    inReset = op.inTriggerButton("Reset"),

    inSpeed = op.inFloat("Speed", 1),
    inFallVelocity = op.inFloat("Add Velocity Y", 0.5),

    next = op.outTrigger("next"),
    outX = op.outNumber("Position X"),
    outY = op.outNumber("Position Y"),
    outZ = op.outNumber("Position Z"),
    transformed = op.outTrigger("Transformed");

inExec.onTriggered = update;

op.setPortGroup("Reset", [inResetX, inResetY, inResetZ, inReset]);

const cgl = op.patch.cgl;
let body = null;
let world = null;
let tmpTrans = null;
let transform = null;
let motionState = null;
const tmpOrigin = vec3.create();
const tmpQuat = quat.create();
const tmpScale = vec3.create();
let transMat = mat4.create();

let forceQuat = null;
let initX = 0, initY = 0, initZ = 0;

let btOrigin = null;
let btQuat = null;
let doResetPos = false;

inName.onChange = updateBodyMeta;

op.onDelete =
    inMass.onChange =
    inRadius.onChange =
    inSizeY.onChange = () =>
    {
        removeBody();
    };

inActivate.onTriggered = () =>
{
    if (body)body.activate();
};

function removeBody()
{
    if (world && body) world.removeRigidBody(body);
    body = null;
}

inReset.onTriggered = () =>
{
    initX = inResetX.get();
    initY = inResetY.get();
    initZ = inResetZ.get();

    removeBody();
};

let btVelocity = null;

function updateBodyMeta()
{
    if (world)
        world.setBodyMeta(body,
            {
                "name": inName.get(),
                "mass": inMass.get(),
            });

    op.setUiAttribs({ "extendTitle": inName.get() });
}

function setup()
{
    if (world && body) world.removeRigidBody(body);

    tmpTrans = new Ammo.btTransform();
    transform = new Ammo.btTransform();

    transform.setIdentity();

    copyCglTransform(transform);

    motionState = new Ammo.btDefaultMotionState(transform);

    let colShape = new Ammo.btCapsuleShape(inRadius.get(), inSizeY.get() - inRadius.get());

    colShape.setMargin(0.05);

    let localInertia = new Ammo.btVector3(0, 0, 0);
    colShape.calculateLocalInertia(inMass.get(), localInertia);

    let rbInfo = new Ammo.btRigidBodyConstructionInfo(inMass.get(), motionState, colShape, localInertia);
    body = new Ammo.btRigidBody(rbInfo);
    // body.setDamping(0.7, 0.01);

    world.addRigidBody(body);

    updateBodyMeta();
}

function renderTransformed()
{
    let ms = body.getMotionState();
    if (ms)
    {
        ms.getWorldTransform(tmpTrans);
        let p = tmpTrans.getOrigin();
        let q = tmpTrans.getRotation();

        if (inStyle.get() == "3rd Person")
            q.setValue(tmpQuat[0], tmpQuat[1], tmpQuat[2], tmpQuat[3]);

        cgl.pushModelMatrix();

        mat4.identity(cgl.mMatrix);

        let scale = [inRadius.get(), inRadius.get(), inRadius.get()];

        mat4.fromRotationTranslationScale(transMat, [q.x(), q.y(), q.z(), q.w()], [
            p.x(), p.y(), p.z()], scale);
        mat4.mul(cgl.mMatrix, cgl.mMatrix, transMat);

        transformed.trigger();

        cgl.popModelMatrix();
    }
}

function copyCglTransform(transform)
{
    if (!btOrigin)
    {
        btOrigin = new Ammo.btVector3(0, 0, 0);
        btQuat = new Ammo.btQuaternion(0, 0, 0, 0);
    }
    mat4.getTranslation(tmpOrigin, cgl.mMatrix);
    mat4.getRotation(tmpQuat, cgl.mMatrix);

    let changed = false;

    btOrigin.setValue(tmpOrigin[0], tmpOrigin[1], tmpOrigin[2]);
    btOrigin = new Ammo.btVector3(initX, initY, initZ);
    btQuat.setValue(tmpQuat[0], tmpQuat[1], tmpQuat[2], tmpQuat[3]);

    transform.setOrigin(btOrigin);
    transform.setRotation(btQuat);
}

function update()
{
    if (world != cgl.frameStore.ammoWorld) removeBody();

    world = cgl.frameStore.ammoWorld;
    if (!world) return;
    if (!body) setup(world);
    if (!body) return;
    body.activate(); // body.setActivationState(Ammo.DISABLE_DEACTIVATION); did not work.....

    if (!btVelocity)
    {
        btVelocity = new Ammo.btVector3(0, 0, 0);
    }

    let vx = 0, vy = 0, vz = 0.0;
    let speed = inSpeed.get();

    let doMove = false;
    if (inMoveZP.get())
    {
        vx = inDirX.get() * speed;
        vy = inDirY.get() * speed;
        vz = inDirZ.get() * speed;
        doMove = true;
    }
    if (inMoveZM.get())
    {
        vx = -inDirX.get() * speed;
        vy = -inDirY.get() * speed;
        vz = -inDirZ.get() * speed;
        doMove = true;
    }

    if (inMoveXP.get())
    {
        vx = -inDirZ.get() * speed;
        vy = inDirY.get() * speed;
        vz = inDirX.get() * speed;
        doMove = true;
    }
    if (inMoveXM.get())
    {
        vx = inDirZ.get() * speed;
        vy = inDirY.get() * speed;
        vz = -inDirX.get() * speed;
        doMove = true;
    }

    if (inMoveYP.get()) vy = 3;
    else vy = 0;

    doMove = true;

    if (doMove)
    {
        btVelocity.setValue(vx, vy - inFallVelocity.get(), vz);
        body.setLinearVelocity(btVelocity);
    }

    if (inMass.get() == 0 || doResetPos)
    {
        copyCglTransform(transform);
        motionState.setWorldTransform(transform);

        body.setWorldTransform(transform);

        doResetPos = false;
    }

    motionState.getWorldTransform(transform);

    // force upright position
    if (!forceQuat) forceQuat = new Ammo.btQuaternion();
    forceQuat.setEulerZYX(0, 90, 0);
    transform.setRotation(forceQuat);
    body.setWorldTransform(transform);
    let p = tmpTrans.getOrigin();

    outX.set(p.x());
    outY.set(p.y());
    outZ.set(p.z());

    renderTransformed();

    next.trigger();
}

}
};

CABLES.OPS["5f6c2a84-8de9-41e5-948a-d9c5ed49022f"]={f:Ops.Extension.AmmoPhysics.AmmoCharacter,objName:"Ops.Extension.AmmoPhysics.AmmoCharacter"};




// **************************************************************
// 
// Ops.Devices.Keyboard.CursorKeys
// 
// **************************************************************

Ops.Devices.Keyboard.CursorKeys= class extends CABLES.Op 
{
constructor()
{
super(...arguments);
const op=this;
const attachments=op.attachments={};
const
    canvasOnly = op.inValueBool("canvas only", true),
    keysCursor = op.inValueBool("Cursor Keys", true),
    keysWasd = op.inValueBool("WASD", true),
    inActive = op.inBool("Active", true),
    outDeg = op.outNumber("Degree"),
    pressedUp = op.outBoolNum("Up"),
    triggerUp = op.outTrigger("Up Pressed"),
    pressedDown = op.outBoolNum("Down"),
    triggerDown = op.outTrigger("Down Pressed"),
    pressedLeft = op.outBoolNum("Left"),
    triggerLeft = op.outTrigger("Left Pressed"),
    pressedRight = op.outBoolNum("Right"),
    triggerRight = op.outTrigger("Right Pressed"),
    outPressed = op.outNumber("Any Button Pressed");

const cgl = op.patch.cgl;

function onKeyDown(e)
{
    if (keysWasd.get())
    {
        if (e.keyCode == 87)
        {
            pressedUp.set(true);
            triggerUp.trigger();
        }
        if (e.keyCode == 83)
        {
            pressedDown.set(true);
            triggerDown.trigger();
        }
        if (e.keyCode == 65)
        {
            pressedLeft.set(true);
            triggerLeft.trigger();
        }
        if (e.keyCode == 68)
        {
            pressedRight.set(true);
            triggerRight.trigger();
        }
    }
    if (keysCursor.get())
    {
        if (e.keyCode == 38)
        {
            pressedUp.set(true);
            triggerUp.trigger();
        }
        if (e.keyCode == 40)
        {
            pressedDown.set(true);
            triggerDown.trigger();
        }
        if (e.keyCode == 37)
        {
            pressedLeft.set(true);
            triggerLeft.trigger();
        }
        if (e.keyCode == 39)
        {
            pressedRight.set(true);
            triggerRight.trigger();
        }
    }

    setDegrees();
    outPressed.set(pressedUp.get() || pressedDown.get() || pressedLeft.get() || pressedRight.get());
}

function setDegrees()
{
    let deg = 0;

    if (pressedUp.get())deg = 360;
    if (pressedRight.get())deg = 90;
    if (pressedDown.get())deg = 180;
    if (pressedLeft.get())deg = 270;

    if (pressedUp.get() && pressedRight.get())deg = 360 + 45;
    if (pressedDown.get() && pressedRight.get())deg = 90 + 45;
    if (pressedDown.get() && pressedLeft.get())deg = 180 + 45;
    if (pressedUp.get() && pressedLeft.get())deg = 270 + 45;

    outDeg.set(deg);
}

function onKeyUp(e)
{
    if (keysWasd.get())
    {
        if (e.keyCode == 87)
        {
            pressedUp.set(false);
            triggerUp.trigger();
        }
        if (e.keyCode == 83)
        {
            pressedDown.set(false);
            triggerDown.trigger();
        }
        if (e.keyCode == 65)
        {
            pressedLeft.set(false);
            triggerLeft.trigger();
        }
        if (e.keyCode == 68)
        {
            pressedRight.set(false);
            triggerRight.trigger();
        }
    }
    if (keysCursor.get())
    {
        if (e.keyCode == 38)
        {
            pressedUp.set(false);
            triggerUp.trigger();
        }
        if (e.keyCode == 40)
        {
            pressedDown.set(false);
            triggerDown.trigger();
        }
        if (e.keyCode == 37)
        {
            pressedLeft.set(false);
            triggerLeft.trigger();
        }
        if (e.keyCode == 39)
        {
            pressedRight.set(false);
            triggerRight.trigger();
        }
    }

    setDegrees();
    outPressed.set(pressedUp.get() || pressedDown.get() || pressedLeft.get() || pressedRight.get());
}

op.onDelete = function ()
{
    cgl.canvas.removeEventListener("keyup", onKeyUp, false);
    cgl.canvas.removeEventListener("keydown", onKeyDown, false);
    document.removeEventListener("keyup", onKeyUp, false);
    document.removeEventListener("keydown", onKeyDown, false);
};

function addListeners()
{
    if (canvasOnly.get()) addCanvasListener();
    else addDocumentListener();
}

function onBlur()
{
    pressedUp.set(false);
    pressedDown.set(false);
    pressedLeft.set(false);
    pressedRight.set(false);
}

inActive.onChange = () =>
{
    pressedUp.set(false);
    pressedDown.set(false);
    pressedLeft.set(false);
    pressedRight.set(false);

    removeListeners();
    if (inActive.get())addListeners();
};

function removeListeners()
{
    cgl.canvas.removeEventListener("blur", onBlur);
    document.removeEventListener("keydown", onKeyDown, false);
    document.removeEventListener("keyup", onKeyUp, false);
    cgl.canvas.removeEventListener("keydown", onKeyDown, false);
    cgl.canvas.removeEventListener("keyup", onKeyUp, false);
}

function addCanvasListener()
{
    cgl.canvas.addEventListener("blur", onBlur);

    cgl.canvas.addEventListener("keydown", onKeyDown, false);
    cgl.canvas.addEventListener("keyup", onKeyUp, false);
}

function addDocumentListener()
{
    document.addEventListener("keydown", onKeyDown, false);
    document.addEventListener("keyup", onKeyUp, false);
}

canvasOnly.onChange = function ()
{
    removeListeners();
    addListeners();
};

canvasOnly.set(true);
addCanvasListener();

}
};

CABLES.OPS["65930ca9-c923-453f-b8c4-144eda13fa0a"]={f:Ops.Devices.Keyboard.CursorKeys,objName:"Ops.Devices.Keyboard.CursorKeys"};




// **************************************************************
// 
// Ops.Devices.Keyboard.KeyPressLearn
// 
// **************************************************************

Ops.Devices.Keyboard.KeyPressLearn= class extends CABLES.Op 
{
constructor()
{
super(...arguments);
const op=this;
const attachments=op.attachments={};
const learnedKeyCode = op.inValueInt("key code");
const canvasOnly = op.inValueBool("canvas only", true);
const modKey = op.inValueSelect("Mod Key", ["none", "alt"], "none");
const inEnable = op.inValueBool("Enabled", true);
const preventDefault = op.inValueBool("Prevent Default");
const learn = op.inTriggerButton("learn");
const onPress = op.outTrigger("on press");
const onRelease = op.outTrigger("on release");
const outPressed = op.outBoolNum("Pressed", false);
const outKey = op.outString("Key");

const cgl = op.patch.cgl;
let learning = false;

modKey.onChange = learnedKeyCode.onChange = updateKeyName;

function onKeyDown(e)
{
    if (learning)
    {
        learnedKeyCode.set(e.keyCode);
        if (CABLES.UI)
        {
            op.refreshParams();
        }
        // op.log("Learned key code: " + learnedKeyCode.get());
        learning = false;
        removeListeners();
        addListener();

        if (CABLES.UI)gui.emitEvent("portValueEdited", op, learnedKeyCode, learnedKeyCode.get());
    }
    else
    {
        if (e.keyCode == learnedKeyCode.get())
        {
            if (modKey.get() == "alt")
            {
                if (e.altKey === true)
                {
                    onPress.trigger();
                    outPressed.set(true);
                    if (preventDefault.get())e.preventDefault();
                }
            }
            else
            {
                onPress.trigger();
                outPressed.set(true);
                if (preventDefault.get())e.preventDefault();
            }
        }
    }
}

function onKeyUp(e)
{
    if (e.keyCode == learnedKeyCode.get())
    {
        let doTrigger = true;
        if (modKey.get() == "alt" && e.altKey != true) doTrigger = false;

        if (doTrigger)
        {
            onRelease.trigger();
            outPressed.set(false);
        }
    }
}

op.onDelete = function ()
{
    cgl.canvas.removeEventListener("keyup", onKeyUp, false);
    cgl.canvas.removeEventListener("keydown", onKeyDown, false);
    document.removeEventListener("keyup", onKeyUp, false);
    document.removeEventListener("keydown", onKeyDown, false);
};

learn.onTriggered = function ()
{
    // op.log("Listening for key...");
    learning = true;
    addDocumentListener();

    setTimeout(function ()
    {
        learning = false;
        removeListeners();
        addListener();
    }, 3000);
};

function addListener()
{
    if (canvasOnly.get()) addCanvasListener();
    else addDocumentListener();
}

function removeListeners()
{
    document.removeEventListener("keydown", onKeyDown, false);
    document.removeEventListener("keyup", onKeyUp, false);
    cgl.canvas.removeEventListener("keydown", onKeyDown, false);
    cgl.canvas.removeEventListener("keyup", onKeyUp, false);
    outPressed.set(false);
}

function addCanvasListener()
{
    if (!CABLES.isNumeric(cgl.canvas.getAttribute("tabindex"))) cgl.canvas.setAttribute("tabindex", 1);

    cgl.canvas.addEventListener("keydown", onKeyDown, false);
    cgl.canvas.addEventListener("keyup", onKeyUp, false);
}

function addDocumentListener()
{
    document.addEventListener("keydown", onKeyDown, false);
    document.addEventListener("keyup", onKeyUp, false);
}

inEnable.onChange = function ()
{
    if (!inEnable.get())
    {
        removeListeners();
    }
    else
    {
        addListener();
    }
};

canvasOnly.onChange = function ()
{
    removeListeners();
    addListener();
};

function updateKeyName()
{
    let keyName = keyCodeToName(learnedKeyCode.get());
    const modKeyName = modKey.get();
    if (modKeyName && modKeyName !== "none")
    {
        keyName = modKeyName.charAt(0).toUpperCase() + modKeyName.slice(1) + "-" + keyName;
    }
    op.setUiAttribs({ "extendTitle": keyName });
    outKey.set(keyName);
}

// todo remove in next version
function keyCodeToName(keyCode)
{
    if (!keyCode && keyCode !== 0) return "Unidentified";
    const keys = {
        "8": "Backspace",
        "9": "Tab",
        "12": "Clear",
        "13": "Enter",
        "16": "Shift",
        "17": "Control",
        "18": "Alt",
        "19": "Pause",
        "20": "CapsLock",
        "27": "Escape",
        "32": "Space",
        "33": "PageUp",
        "34": "PageDown",
        "35": "End",
        "36": "Home",
        "37": "ArrowLeft",
        "38": "ArrowUp",
        "39": "ArrowRight",
        "40": "ArrowDown",
        "45": "Insert",
        "46": "Delete",
        "112": "F1",
        "113": "F2",
        "114": "F3",
        "115": "F4",
        "116": "F5",
        "117": "F6",
        "118": "F7",
        "119": "F8",
        "120": "F9",
        "121": "F10",
        "122": "F11",
        "123": "F12",
        "144": "NumLock",
        "145": "ScrollLock",
        "224": "Meta"
    };
    if (keys[keyCode])
    {
        return keys[keyCode];
    }
    else
    {
        return String.fromCharCode(keyCode);
    }
}

addCanvasListener();

}
};

CABLES.OPS["f069c0db-4051-4eae-989e-6ef7953787fd"]={f:Ops.Devices.Keyboard.KeyPressLearn,objName:"Ops.Devices.Keyboard.KeyPressLearn"};




// **************************************************************
// 
// Ops.Gl.Matrix.Transform
// 
// **************************************************************

Ops.Gl.Matrix.Transform= class extends CABLES.Op 
{
constructor()
{
super(...arguments);
const op=this;
const attachments=op.attachments={};
const
    render = op.inTrigger("render"),
    posX = op.inValue("posX", 0),
    posY = op.inValue("posY", 0),
    posZ = op.inValue("posZ", 0),
    scale = op.inValue("scale", 1),
    rotX = op.inValue("rotX", 0),
    rotY = op.inValue("rotY", 0),
    rotZ = op.inValue("rotZ", 0),
    trigger = op.outTrigger("trigger");

op.setPortGroup("Rotation", [rotX, rotY, rotZ]);
op.setPortGroup("Position", [posX, posY, posZ]);
op.setPortGroup("Scale", [scale]);
op.setUiAxisPorts(posX, posY, posZ);

op.toWorkPortsNeedToBeLinked(render, trigger);

const vPos = vec3.create();
const vScale = vec3.create();
const transMatrix = mat4.create();
mat4.identity(transMatrix);

let
    doScale = false,
    doTranslate = false,
    translationChanged = true,
    scaleChanged = true,
    rotChanged = true;

rotX.onChange = rotY.onChange = rotZ.onChange = setRotChanged;
posX.onChange = posY.onChange = posZ.onChange = setTranslateChanged;
scale.onChange = setScaleChanged;

render.onTriggered = function ()
{
    // if(!CGL.TextureEffect.checkOpNotInTextureEffect(op)) return;

    let updateMatrix = false;
    if (translationChanged)
    {
        updateTranslation();
        updateMatrix = true;
    }
    if (scaleChanged)
    {
        updateScale();
        updateMatrix = true;
    }
    if (rotChanged) updateMatrix = true;

    if (updateMatrix) doUpdateMatrix();

    const cg = op.patch.cg || op.patch.cgl;
    cg.pushModelMatrix();
    mat4.multiply(cg.mMatrix, cg.mMatrix, transMatrix);

    trigger.trigger();
    cg.popModelMatrix();

    if (CABLES.UI)
    {
        if (!posX.isLinked() && !posY.isLinked() && !posZ.isLinked())
        {
            gui.setTransform(op.id, posX.get(), posY.get(), posZ.get());

            if (op.isCurrentUiOp())
                gui.setTransformGizmo(
                    {
                        "posX": posX,
                        "posY": posY,
                        "posZ": posZ,
                    });
        }
    }
};

// op.transform3d = function ()
// {
//     return { "pos": [posX, posY, posZ] };
// };

function doUpdateMatrix()
{
    mat4.identity(transMatrix);
    if (doTranslate)mat4.translate(transMatrix, transMatrix, vPos);

    if (rotX.get() !== 0)mat4.rotateX(transMatrix, transMatrix, rotX.get() * CGL.DEG2RAD);
    if (rotY.get() !== 0)mat4.rotateY(transMatrix, transMatrix, rotY.get() * CGL.DEG2RAD);
    if (rotZ.get() !== 0)mat4.rotateZ(transMatrix, transMatrix, rotZ.get() * CGL.DEG2RAD);

    if (doScale)mat4.scale(transMatrix, transMatrix, vScale);
    rotChanged = false;
}

function updateTranslation()
{
    doTranslate = false;
    if (posX.get() !== 0.0 || posY.get() !== 0.0 || posZ.get() !== 0.0) doTranslate = true;
    vec3.set(vPos, posX.get(), posY.get(), posZ.get());
    translationChanged = false;
}

function updateScale()
{
    // doScale=false;
    // if(scale.get()!==0.0)
    doScale = true;
    vec3.set(vScale, scale.get(), scale.get(), scale.get());
    scaleChanged = false;
}

function setTranslateChanged()
{
    translationChanged = true;
}

function setScaleChanged()
{
    scaleChanged = true;
}

function setRotChanged()
{
    rotChanged = true;
}

doUpdateMatrix();

}
};

CABLES.OPS["650baeb1-db2d-4781-9af6-ab4e9d4277be"]={f:Ops.Gl.Matrix.Transform,objName:"Ops.Gl.Matrix.Transform"};




// **************************************************************
// 
// Ops.Vars.VarGetNumber_v2
// 
// **************************************************************

Ops.Vars.VarGetNumber_v2= class extends CABLES.Op 
{
constructor()
{
super(...arguments);
const op=this;
const attachments=op.attachments={};
const val = op.outNumber("Value");
op.varName = op.inValueSelect("Variable", [], "", true);

new CABLES.VarGetOpWrapper(op, "number", op.varName, val);

}
};

CABLES.OPS["421f5b52-c0fa-47c4-8b7a-012b9e1c864a"]={f:Ops.Vars.VarGetNumber_v2,objName:"Ops.Vars.VarGetNumber_v2"};




// **************************************************************
// 
// Ops.Html.ElementChilds_v2
// 
// **************************************************************

Ops.Html.ElementChilds_v2= class extends CABLES.Op 
{
constructor()
{
super(...arguments);
const op=this;
const attachments=op.attachments={};
const
    parentPort = op.inObject("Parent", null, "element"),
    outParent = op.outObject("Parent Out", null, "element");

const canvas = op.patch.cgl.canvas.parentElement;

op.toWorkPortsNeedToBeLinked(parentPort);

const inPorts = [];
for (let i = 0; i < 10; i++)
{
    const p = op.inObject("Child " + (i + 1), null, "element");
    inPorts.push(p);
    p.onChange = () =>
    {
        rebuild();
        if (!p.get())
        {
            const selector = "[data-cables-child-id='" + op.id + "_" + i + "']";
            const currentChild = canvas.querySelector(selector);
            if (currentChild) delete currentChild.dataset.cablesChildId;
        }
    };
    p.onLinkChanged = () =>
    {
        if (!p.isLinked())
        {
            const selector = "[data-cables-child-id='" + op.id + "_" + i + "']";
            const currentChild = canvas.querySelector(selector);
            if (currentChild) currentChild.remove();
        }
    };
}

parentPort.onLinkChanged = () =>
{
    if (!parentPort.isLinked())
    {
        cleanUp();
    }
    else
    {
        rebuild();
    }
};

outParent.onLinkChanged = () =>
{
    if (!outParent.isLinked())
    {
        const parentDiv = parentPort.get();
        if (parentDiv && parentDiv.dataset.op)
        {
            const inDoc = canvas.querySelector("[data-op=' " + parentDiv.dataset.op + " ']");
            if (!inDoc)
            {
                canvas.appendChild(parentDiv);
            }
        }
    }
};

parentPort.onChange = () =>
{
    if (!parentPort.get())
    {
        cleanUp();
    }
    rebuild();
};

function cleanUp()
{
    for (let i = 0; i < inPorts.length; i++)
    {
        const selector = "[data-cables-child-id='" + op.id + "_" + i + "']";
        const currentChild = canvas.querySelector(selector);
        if (currentChild && currentChild.parentNode)
        {
            currentChild.remove();
        }
    }
    outParent.set(null);
}

function rebuild()
{
    const parent = parentPort.get();
    if (!parent)
    {
        outParent.set(null);
        return;
    }

    if (!parent.querySelector)
    {
        outParent.set(null);
        return;
    }

    op.setUiError("id", null);
    try
    {
        op.setUiError("multilinks", null);

        for (let i = 0; i < inPorts.length; i++)
        {
            const selector = "[data-cables-child-id='" + op.id + "_" + i + "']";
            const currentChild = parent.querySelector(selector);
            if (currentChild)
            {
                currentChild.remove();
            }
            const p = inPorts[i].get();
            if (inPorts[i].links.length > 1)
            {
                op.setUiError("multilinks", "Every port should only have not more then one connection");
            }
            if (p && parent)
            {
                if (!p.dataset)console.warn("[elementChilds] p no dataset ?!");
                else p.dataset.cablesChildId = op.id + "_" + i;
                parent.appendChild(p);
            }
        }
    }
    catch (e)
    {
        op.setUiError("id", e.message);
    }
    outParent.setRef(parent);
}

}
};

CABLES.OPS["ad7eea9a-f4af-4ab7-bb70-922242529681"]={f:Ops.Html.ElementChilds_v2,objName:"Ops.Html.ElementChilds_v2"};




// **************************************************************
// 
// Ops.Html.ElementInteraction
// 
// **************************************************************

Ops.Html.ElementInteraction= class extends CABLES.Op 
{
constructor()
{
super(...arguments);
const op=this;
const attachments=op.attachments={};
const
    inEle = op.inObject("Element"),
    inAct = op.inBool("Active", true),
    outIsDownLeft = op.outBool("Mouse Is Down Left"),
    outIsDownRight = op.outBool("Mouse Is Down Right"),
    outDownLeft = op.outTrigger("Mouse Down Left"),
    outDownRight = op.outTrigger("Mouse Down Right"),
    outUpLeft = op.outTrigger("Mouse Up Left"),
    outUpRight = op.outTrigger("Mouse Up Right"),
    outOver = op.outBool("Mouse Over"),
    outEnter = op.outTrigger("Mouse Enter"),
    outLeave = op.outTrigger("Mouse Leave"),
    outPosX = op.outNumber("Offset X"),
    outPosY = op.outNumber("Offset Y");

let ele = null;

inEle.onChange = () =>
{
    const el = inEle.get();

    if (el) addListeners(el);
    else removeListeners();
};

function addListeners(el)
{
    ele = el;

    ele.addEventListener("pointerenter", onEnter);
    ele.addEventListener("pointerleave", onLeave);
    ele.addEventListener("pointermove", onMove);
    ele.addEventListener("pointerdown", onDown);
    ele.addEventListener("pointerup", onUp);
}

function removeListeners()
{
    if (!ele) return;
    ele.removeEventListener("pointerenter", onEnter);
    ele.removeEventListener("pointerleave", onLeave);
    ele.removeEventListener("pointermove", onMove);
    ele.removeEventListener("pointerdown", onDown);
    ele.removeEventListener("pointerup", onUp);
}

function onMove(e)
{
    outPosX.set(e.offsetX);
    outPosY.set(e.offsetY);
    // console.log();
    outIsDownLeft.set(e.buttons == 1);
    outIsDownRight.set(e.which == 2);
}

function onDown(e)
{
    outPosX.set(e.offsetX);
    outPosY.set(e.offsetY);

    if (e.which == 1)outDownLeft.trigger();
    if (e.which == 2)outDownRight.trigger();

    ele.setPointerCapture(e.pointerId);

    outIsDownLeft.set(e.which == 1);
    outIsDownRight.set(e.which == 2);
}

function onUp(e)
{
    outPosX.set(e.offsetX);
    outPosY.set(e.offsetY);

    ele.releasePointerCapture(e.pointerId);

    if (e.which == 1)outUpLeft.trigger();
    if (e.which == 2)outUpRight.trigger();
    outIsDownRight.set(false);
    outIsDownLeft.set(false);
}

function onEnter()
{
    outEnter.trigger();
    outOver.set(true);
}

function onLeave()
{
    outLeave.trigger();
    outIsDownLeft.set(false);
    outOver.set(false);
}

}
};

CABLES.OPS["bc2903a0-ee7f-4918-b1d8-ea3a6262e3ee"]={f:Ops.Html.ElementInteraction,objName:"Ops.Html.ElementInteraction"};




// **************************************************************
// 
// Ops.Ui.Area
// 
// **************************************************************

Ops.Ui.Area= class extends CABLES.Op 
{
constructor()
{
super(...arguments);
const op=this;
const attachments=op.attachments={};
const
    inTitle = op.inString("Title", ""),
    inDelete = op.inTriggerButton("Delete");

inTitle.setUiAttribs({ "hidePort": true });

op.setUiAttrib({ "hasArea": true });

op.init =
    inTitle.onChange =
    op.onLoaded = update;

update();

function update()
{
    if (CABLES.UI)
    {
        gui.savedState.setUnSaved("areaOp", op.getSubPatch());
        op.uiAttr(
            {
                "comment_title": inTitle.get() || " "
            });

        op.name = inTitle.get();
    }
}

inDelete.onTriggered = () =>
{
    op.patch.deleteOp(op.id);
};

}
};

CABLES.OPS["38f79614-b0de-4960-8da5-2827e7f43415"]={f:Ops.Ui.Area,objName:"Ops.Ui.Area"};




// **************************************************************
// 
// Ops.Sidebar.Sidebar
// 
// **************************************************************

Ops.Sidebar.Sidebar= class extends CABLES.Op 
{
constructor()
{
super(...arguments);
const op=this;
const attachments=op.attachments={"style_css":" /*\r\n * SIDEBAR\r\n  http://danielstern.ca/range.css/#/\r\n  https://developer.mozilla.org/en-US/docs/Web/CSS/::-webkit-progress-value\r\n */\r\n\r\n.sidebar-icon-undo\r\n{\r\n    width:10px;\r\n    height:10px;\r\n    background-image: url(\"data:image/svg+xml;charset=utf8, %3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' fill='none' stroke='grey' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M3 7v6h6'/%3E%3Cpath d='M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13'/%3E%3C/svg%3E\");\r\n    background-size: 19px;\r\n    background-repeat: no-repeat;\r\n    top: -19px;\r\n    margin-top: -7px;\r\n}\r\n\r\n.icon-chevron-down {\r\n    top: 2px;\r\n    right: 9px;\r\n}\r\n\r\n.iconsidebar-chevron-up,.sidebar__close-button {\r\n\tbackground-image: url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM4ODg4ODgiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBjbGFzcz0iZmVhdGhlciBmZWF0aGVyLWNoZXZyb24tdXAiPjxwb2x5bGluZSBwb2ludHM9IjE4IDE1IDEyIDkgNiAxNSI+PC9wb2x5bGluZT48L3N2Zz4=);\r\n}\r\n\r\n.iconsidebar-minimizebutton {\r\n    background-position: 98% center;\r\n    background-repeat: no-repeat;\r\n}\r\n\r\n.sidebar-cables-right\r\n{\r\n    right: 15px;\r\n    left: initial !important;\r\n}\r\n\r\n.sidebar-cables *\r\n{\r\n    color: #BBBBBB !important;\r\n    font-family: Arial;\r\n}\r\n\r\n.sidebar-cables {\r\n    --sidebar-color: #07f78c;\r\n    --sidebar-width: 220px;\r\n    --sidebar-border-radius: 10px;\r\n    --sidebar-monospace-font-stack: \"SFMono-Regular\", Consolas, \"Liberation Mono\", Menlo, Courier, monospace;\r\n    --sidebar-hover-transition-time: .2s;\r\n\r\n    position: absolute;\r\n    top: 15px;\r\n    left: 15px;\r\n    border-radius: var(--sidebar-border-radius);\r\n    z-index: 100000;\r\n    width: var(--sidebar-width);\r\n    max-height: 100%;\r\n    box-sizing: border-box;\r\n    overflow-y: auto;\r\n    overflow-x: hidden;\r\n    font-size: 13px;\r\n    line-height: 1em; /* prevent emojis from breaking height of the title */\r\n}\r\n\r\n.sidebar-cables::selection {\r\n    background-color: var(--sidebar-color);\r\n    color: #EEEEEE;\r\n}\r\n\r\n.sidebar-cables::-webkit-scrollbar {\r\n    background-color: transparent;\r\n    --cables-scrollbar-width: 8px;\r\n    width: var(--cables-scrollbar-width);\r\n}\r\n\r\n.sidebar-cables::-webkit-scrollbar-track {\r\n    background-color: transparent;\r\n    width: var(--cables-scrollbar-width);\r\n}\r\n\r\n.sidebar-cables::-webkit-scrollbar-thumb {\r\n    background-color: #333333;\r\n    border-radius: 4px;\r\n    width: var(--cables-scrollbar-width);\r\n}\r\n\r\n.sidebar-cables--closed {\r\n    width: auto;\r\n}\r\n\r\n.sidebar__close-button {\r\n    background-color: #222;\r\n    /*-webkit-user-select: none;  */\r\n    /*-moz-user-select: none;     */\r\n    /*-ms-user-select: none;      */\r\n    /*user-select: none;          */\r\n    /*transition: background-color var(--sidebar-hover-transition-time);*/\r\n    /*color: #CCCCCC;*/\r\n    height: 2px;\r\n    /*border-bottom:20px solid #222;*/\r\n\r\n    /*box-sizing: border-box;*/\r\n    /*padding-top: 2px;*/\r\n    /*text-align: center;*/\r\n    /*cursor: pointer;*/\r\n    /*border-radius: 0 0 var(--sidebar-border-radius) var(--sidebar-border-radius);*/\r\n    /*opacity: 1.0;*/\r\n    /*transition: opacity 0.3s;*/\r\n    /*overflow: hidden;*/\r\n}\r\n\r\n.sidebar__close-button-icon {\r\n    display: inline-block;\r\n    /*opacity: 0;*/\r\n    width: 20px;\r\n    height: 20px;\r\n    /*position: relative;*/\r\n    /*top: -1px;*/\r\n\r\n\r\n}\r\n\r\n.sidebar--closed {\r\n    width: auto;\r\n    margin-right: 20px;\r\n}\r\n\r\n.sidebar--closed .sidebar__close-button {\r\n    margin-top: 8px;\r\n    margin-left: 8px;\r\n    padding:10px;\r\n\r\n    height: 25px;\r\n    width:25px;\r\n    border-radius: 50%;\r\n    cursor: pointer;\r\n    opacity: 0.3;\r\n    background-repeat: no-repeat;\r\n    background-position: center center;\r\n    transform:rotate(180deg);\r\n}\r\n\r\n.sidebar--closed .sidebar__group\r\n{\r\n    display:none;\r\n\r\n}\r\n.sidebar--closed .sidebar__close-button-icon {\r\n    background-position: 0px 0px;\r\n}\r\n\r\n.sidebar__close-button:hover {\r\n    background-color: #111111;\r\n    opacity: 1.0 !important;\r\n}\r\n\r\n/*\r\n * SIDEBAR ITEMS\r\n */\r\n\r\n.sidebar__items {\r\n    /* max-height: 1000px; */\r\n    /* transition: max-height 0.5;*/\r\n    background-color: #222;\r\n    padding-bottom: 20px;\r\n}\r\n\r\n.sidebar--closed .sidebar__items {\r\n    /* max-height: 0; */\r\n    height: 0;\r\n    display: none;\r\n    pointer-interactions: none;\r\n}\r\n\r\n.sidebar__item__right {\r\n    float: right;\r\n}\r\n\r\n/*\r\n * SIDEBAR GROUP\r\n */\r\n\r\n.sidebar__group {\r\n    /*background-color: #1A1A1A;*/\r\n    overflow: hidden;\r\n    box-sizing: border-box;\r\n    animate: height;\r\n    /*background-color: #151515;*/\r\n    /* max-height: 1000px; */\r\n    /* transition: max-height 0.5s; */\r\n--sidebar-group-header-height: 33px;\r\n}\r\n\r\n.sidebar__group-items\r\n{\r\n    padding-top: 15px;\r\n    padding-bottom: 15px;\r\n}\r\n\r\n.sidebar__group--closed {\r\n    /* max-height: 13px; */\r\n    height: var(--sidebar-group-header-height);\r\n}\r\n\r\n.sidebar__group-header {\r\n    box-sizing: border-box;\r\n    color: #EEEEEE;\r\n    background-color: #151515;\r\n    -webkit-user-select: none;  /* Chrome all / Safari all */\r\n    -moz-user-select: none;     /* Firefox all */\r\n    -ms-user-select: none;      /* IE 10+ */\r\n    user-select: none;          /* Likely future */\r\n\r\n    /*height: 100%;//var(--sidebar-group-header-height);*/\r\n\r\n    padding-top: 7px;\r\n    text-transform: uppercase;\r\n    letter-spacing: 0.08em;\r\n    cursor: pointer;\r\n    /*transition: background-color var(--sidebar-hover-transition-time);*/\r\n    position: relative;\r\n}\r\n\r\n.sidebar__group-header:hover {\r\n  background-color: #111111;\r\n}\r\n\r\n.sidebar__group-header-title {\r\n  /*float: left;*/\r\n  overflow: hidden;\r\n  padding: 0 15px;\r\n  padding-top:5px;\r\n  padding-bottom:10px;\r\n  font-weight:bold;\r\n}\r\n\r\n.sidebar__group-header-undo {\r\n    float: right;\r\n    overflow: hidden;\r\n    padding-right: 15px;\r\n    padding-top:5px;\r\n    font-weight:bold;\r\n  }\r\n\r\n.sidebar__group-header-icon {\r\n    width: 17px;\r\n    height: 14px;\r\n    background-repeat: no-repeat;\r\n    display: inline-block;\r\n    position: absolute;\r\n    background-size: cover;\r\n\r\n    /* icon open */\r\n    /* feather icon: chevron up */\r\n    background-image: url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM4ODg4ODgiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBjbGFzcz0iZmVhdGhlciBmZWF0aGVyLWNoZXZyb24tdXAiPjxwb2x5bGluZSBwb2ludHM9IjE4IDE1IDEyIDkgNiAxNSI+PC9wb2x5bGluZT48L3N2Zz4=);\r\n    top: 4px;\r\n    right: 5px;\r\n    opacity: 0.0;\r\n    transition: opacity 0.3;\r\n}\r\n\r\n.sidebar__group-header:hover .sidebar__group-header-icon {\r\n    opacity: 1.0;\r\n}\r\n\r\n/* icon closed */\r\n.sidebar__group--closed .sidebar__group-header-icon {\r\n    /* feather icon: chevron down */\r\n    background-image: url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM4ODg4ODgiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBjbGFzcz0iZmVhdGhlciBmZWF0aGVyLWNoZXZyb24tZG93biI+PHBvbHlsaW5lIHBvaW50cz0iNiA5IDEyIDE1IDE4IDkiPjwvcG9seWxpbmU+PC9zdmc+);\r\n    top: 4px;\r\n    right: 5px;\r\n}\r\n\r\n/*\r\n * SIDEBAR ITEM\r\n */\r\n\r\n.sidebar__item\r\n{\r\n    box-sizing: border-box;\r\n    padding: 7px;\r\n    padding-left:15px;\r\n    padding-right:15px;\r\n\r\n    overflow: hidden;\r\n    position: relative;\r\n}\r\n\r\n.sidebar__item-label {\r\n    display: inline-block;\r\n    -webkit-user-select: none;  /* Chrome all / Safari all */\r\n    -moz-user-select: none;     /* Firefox all */\r\n    -ms-user-select: none;      /* IE 10+ */\r\n    user-select: none;          /* Likely future */\r\n    width: calc(50% - 7px);\r\n    margin-right: 7px;\r\n    margin-top: 2px;\r\n    text-overflow: ellipsis;\r\n    /* overflow: hidden; */\r\n}\r\n\r\n.sidebar__item-value-label {\r\n    font-family: var(--sidebar-monospace-font-stack);\r\n    display: inline-block;\r\n    text-overflow: ellipsis;\r\n    overflow: hidden;\r\n    white-space: nowrap;\r\n    max-width: 60%;\r\n}\r\n\r\n.sidebar__item-value-label::selection {\r\n    background-color: var(--sidebar-color);\r\n    color: #EEEEEE;\r\n}\r\n\r\n.sidebar__item + .sidebar__item,\r\n.sidebar__item + .sidebar__group,\r\n.sidebar__group + .sidebar__item,\r\n.sidebar__group + .sidebar__group {\r\n    /*border-top: 1px solid #272727;*/\r\n}\r\n\r\n/*\r\n * SIDEBAR ITEM TOGGLE\r\n */\r\n\r\n/*.sidebar__toggle */\r\n.icon_toggle{\r\n    cursor: pointer;\r\n}\r\n\r\n.sidebar__toggle-input {\r\n    --sidebar-toggle-input-color: #CCCCCC;\r\n    --sidebar-toggle-input-color-hover: #EEEEEE;\r\n    --sidebar-toggle-input-border-size: 2px;\r\n    display: inline;\r\n    float: right;\r\n    box-sizing: border-box;\r\n    border-radius: 50%;\r\n    /*outline-style: solid;*/\r\n    /*outline-color:red;*/\r\n    cursor: pointer;\r\n    --toggle-size: 11px;\r\n    margin-top: 2px;\r\n    background-color: transparent !important;\r\n    border: var(--sidebar-toggle-input-border-size) solid var(--sidebar-toggle-input-color);\r\n    width: var(--toggle-size);\r\n    height: var(--toggle-size);\r\n    transition: background-color var(--sidebar-hover-transition-time);\r\n    transition: border-color var(--sidebar-hover-transition-time);\r\n}\r\n.sidebar__toggle:hover .sidebar__toggle-input {\r\n    border-color: var(--sidebar-toggle-input-color-hover);\r\n}\r\n\r\n.sidebar__toggle .sidebar__item-value-label {\r\n    -webkit-user-select: none;  /* Chrome all / Safari all */\r\n    -moz-user-select: none;     /* Firefox all */\r\n    -ms-user-select: none;      /* IE 10+ */\r\n    user-select: none;          /* Likely future */\r\n    max-width: calc(50% - 12px);\r\n}\r\n.sidebar__toggle-input::after { clear: both; }\r\n\r\n.sidebar__toggle--active .icon_toggle\r\n{\r\n\r\n    background-image: url(data:image/svg+xml;base64,PHN2ZyBoZWlnaHQ9IjE1cHgiIHdpZHRoPSIzMHB4IiBmaWxsPSIjMDZmNzhiIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB2ZXJzaW9uPSIxLjEiIHg9IjBweCIgeT0iMHB4IiB2aWV3Qm94PSIwIDAgMTAwIDEwMCIgZW5hYmxlLWJhY2tncm91bmQ9Im5ldyAwIDAgMTAwIDEwMCIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSI+PGcgZGlzcGxheT0ibm9uZSI+PGcgZGlzcGxheT0iaW5saW5lIj48Zz48cGF0aCBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGNsaXAtcnVsZT0iZXZlbm9kZCIgZmlsbD0iIzA2Zjc4YiIgZD0iTTMwLDI3QzE3LjM1LDI3LDcsMzcuMzUsNyw1MGwwLDBjMCwxMi42NSwxMC4zNSwyMywyMywyM2g0MCBjMTIuNjUsMCwyMy0xMC4zNSwyMy0yM2wwLDBjMC0xMi42NS0xMC4zNS0yMy0yMy0yM0gzMHogTTcwLDY3Yy05LjM4OSwwLTE3LTcuNjEtMTctMTdzNy42MTEtMTcsMTctMTdzMTcsNy42MSwxNywxNyAgICAgUzc5LjM4OSw2Nyw3MCw2N3oiPjwvcGF0aD48L2c+PC9nPjwvZz48Zz48cGF0aCBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGNsaXAtcnVsZT0iZXZlbm9kZCIgZD0iTTMwLDI3QzE3LjM1LDI3LDcsMzcuMzUsNyw1MGwwLDBjMCwxMi42NSwxMC4zNSwyMywyMywyM2g0MCAgIGMxMi42NSwwLDIzLTEwLjM1LDIzLTIzbDAsMGMwLTEyLjY1LTEwLjM1LTIzLTIzLTIzSDMweiBNNzAsNjdjLTkuMzg5LDAtMTctNy42MS0xNy0xN3M3LjYxMS0xNywxNy0xN3MxNyw3LjYxLDE3LDE3ICAgUzc5LjM4OSw2Nyw3MCw2N3oiPjwvcGF0aD48L2c+PGcgZGlzcGxheT0ibm9uZSI+PGcgZGlzcGxheT0iaW5saW5lIj48cGF0aCBmaWxsPSIjMDZmNzhiIiBzdHJva2U9IiMwNmY3OGIiIHN0cm9rZS13aWR0aD0iNCIgc3Ryb2tlLW1pdGVybGltaXQ9IjEwIiBkPSJNNyw1MGMwLDEyLjY1LDEwLjM1LDIzLDIzLDIzaDQwICAgIGMxMi42NSwwLDIzLTEwLjM1LDIzLTIzbDAsMGMwLTEyLjY1LTEwLjM1LTIzLTIzLTIzSDMwQzE3LjM1LDI3LDcsMzcuMzUsNyw1MEw3LDUweiI+PC9wYXRoPjwvZz48Y2lyY2xlIGRpc3BsYXk9ImlubGluZSIgZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGZpbGw9IiMwNmY3OGIiIHN0cm9rZT0iIzA2Zjc4YiIgc3Ryb2tlLXdpZHRoPSI0IiBzdHJva2UtbWl0ZXJsaW1pdD0iMTAiIGN4PSI3MCIgY3k9IjUwIiByPSIxNyI+PC9jaXJjbGU+PC9nPjxnIGRpc3BsYXk9Im5vbmUiPjxwYXRoIGRpc3BsYXk9ImlubGluZSIgZD0iTTcwLDI1SDMwQzE2LjIxNSwyNSw1LDM2LjIxNSw1LDUwczExLjIxNSwyNSwyNSwyNWg0MGMxMy43ODUsMCwyNS0xMS4yMTUsMjUtMjVTODMuNzg1LDI1LDcwLDI1eiBNNzAsNzEgICBIMzBDMTguNDIxLDcxLDksNjEuNTc5LDksNTBzOS40MjEtMjEsMjEtMjFoNDBjMTEuNTc5LDAsMjEsOS40MjEsMjEsMjFTODEuNTc5LDcxLDcwLDcxeiBNNzAsMzFjLTEwLjQ3NywwLTE5LDguNTIzLTE5LDE5ICAgczguNTIzLDE5LDE5LDE5czE5LTguNTIzLDE5LTE5UzgwLjQ3NywzMSw3MCwzMXogTTcwLDY1Yy04LjI3MSwwLTE1LTYuNzI5LTE1LTE1czYuNzI5LTE1LDE1LTE1czE1LDYuNzI5LDE1LDE1Uzc4LjI3MSw2NSw3MCw2NXoiPjwvcGF0aD48L2c+PC9zdmc+);\r\n    opacity: 1;\r\n    transform: rotate(0deg);\r\n    background-position: -4px -9px;\r\n}\r\n\r\n\r\n.icon_toggle\r\n{\r\n    float: right;\r\n    width:40px;\r\n    height:18px;\r\n    background-image: url(data:image/svg+xml;base64,PHN2ZyBoZWlnaHQ9IjE1cHgiIHdpZHRoPSIzMHB4IiBmaWxsPSIjYWFhYWFhIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB2ZXJzaW9uPSIxLjEiIHg9IjBweCIgeT0iMHB4IiB2aWV3Qm94PSIwIDAgMTAwIDEwMCIgZW5hYmxlLWJhY2tncm91bmQ9Im5ldyAwIDAgMTAwIDEwMCIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSI+PGcgZGlzcGxheT0ibm9uZSI+PGcgZGlzcGxheT0iaW5saW5lIj48Zz48cGF0aCBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGNsaXAtcnVsZT0iZXZlbm9kZCIgZmlsbD0iI2FhYWFhYSIgZD0iTTMwLDI3QzE3LjM1LDI3LDcsMzcuMzUsNyw1MGwwLDBjMCwxMi42NSwxMC4zNSwyMywyMywyM2g0MCBjMTIuNjUsMCwyMy0xMC4zNSwyMy0yM2wwLDBjMC0xMi42NS0xMC4zNS0yMy0yMy0yM0gzMHogTTcwLDY3Yy05LjM4OSwwLTE3LTcuNjEtMTctMTdzNy42MTEtMTcsMTctMTdzMTcsNy42MSwxNywxNyAgICAgUzc5LjM4OSw2Nyw3MCw2N3oiPjwvcGF0aD48L2c+PC9nPjwvZz48Zz48cGF0aCBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGNsaXAtcnVsZT0iZXZlbm9kZCIgZD0iTTMwLDI3QzE3LjM1LDI3LDcsMzcuMzUsNyw1MGwwLDBjMCwxMi42NSwxMC4zNSwyMywyMywyM2g0MCAgIGMxMi42NSwwLDIzLTEwLjM1LDIzLTIzbDAsMGMwLTEyLjY1LTEwLjM1LTIzLTIzLTIzSDMweiBNNzAsNjdjLTkuMzg5LDAtMTctNy42MS0xNy0xN3M3LjYxMS0xNywxNy0xN3MxNyw3LjYxLDE3LDE3ICAgUzc5LjM4OSw2Nyw3MCw2N3oiPjwvcGF0aD48L2c+PGcgZGlzcGxheT0ibm9uZSI+PGcgZGlzcGxheT0iaW5saW5lIj48cGF0aCBmaWxsPSIjYWFhYWFhIiBzdHJva2U9IiNhYWFhYWEiIHN0cm9rZS13aWR0aD0iNCIgc3Ryb2tlLW1pdGVybGltaXQ9IjEwIiBkPSJNNyw1MGMwLDEyLjY1LDEwLjM1LDIzLDIzLDIzaDQwICAgIGMxMi42NSwwLDIzLTEwLjM1LDIzLTIzbDAsMGMwLTEyLjY1LTEwLjM1LTIzLTIzLTIzSDMwQzE3LjM1LDI3LDcsMzcuMzUsNyw1MEw3LDUweiI+PC9wYXRoPjwvZz48Y2lyY2xlIGRpc3BsYXk9ImlubGluZSIgZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGZpbGw9IiNhYWFhYWEiIHN0cm9rZT0iI2FhYWFhYSIgc3Ryb2tlLXdpZHRoPSI0IiBzdHJva2UtbWl0ZXJsaW1pdD0iMTAiIGN4PSI3MCIgY3k9IjUwIiByPSIxNyI+PC9jaXJjbGU+PC9nPjxnIGRpc3BsYXk9Im5vbmUiPjxwYXRoIGRpc3BsYXk9ImlubGluZSIgZD0iTTcwLDI1SDMwQzE2LjIxNSwyNSw1LDM2LjIxNSw1LDUwczExLjIxNSwyNSwyNSwyNWg0MGMxMy43ODUsMCwyNS0xMS4yMTUsMjUtMjVTODMuNzg1LDI1LDcwLDI1eiBNNzAsNzEgICBIMzBDMTguNDIxLDcxLDksNjEuNTc5LDksNTBzOS40MjEtMjEsMjEtMjFoNDBjMTEuNTc5LDAsMjEsOS40MjEsMjEsMjFTODEuNTc5LDcxLDcwLDcxeiBNNzAsMzFjLTEwLjQ3NywwLTE5LDguNTIzLTE5LDE5ICAgczguNTIzLDE5LDE5LDE5czE5LTguNTIzLDE5LTE5UzgwLjQ3NywzMSw3MCwzMXogTTcwLDY1Yy04LjI3MSwwLTE1LTYuNzI5LTE1LTE1czYuNzI5LTE1LDE1LTE1czE1LDYuNzI5LDE1LDE1Uzc4LjI3MSw2NSw3MCw2NXoiPjwvcGF0aD48L2c+PC9zdmc+);\r\n    background-size: 50px 37px;\r\n    background-position: -6px -10px;\r\n    transform: rotate(180deg);\r\n    opacity: 0.4;\r\n}\r\n\r\n\r\n\r\n/*.sidebar__toggle--active .sidebar__toggle-input {*/\r\n/*    transition: background-color var(--sidebar-hover-transition-time);*/\r\n/*    background-color: var(--sidebar-toggle-input-color);*/\r\n/*}*/\r\n/*.sidebar__toggle--active .sidebar__toggle-input:hover*/\r\n/*{*/\r\n/*    background-color: var(--sidebar-toggle-input-color-hover);*/\r\n/*    border-color: var(--sidebar-toggle-input-color-hover);*/\r\n/*    transition: background-color var(--sidebar-hover-transition-time);*/\r\n/*    transition: border-color var(--sidebar-hover-transition-time);*/\r\n/*}*/\r\n\r\n/*\r\n * SIDEBAR ITEM BUTTON\r\n */\r\n\r\n.sidebar__button {}\r\n\r\n.sidebar__button-input:active\r\n{\r\n    background-color: #555 !important;\r\n}\r\n\r\n.sidebar__button-input {\r\n    -webkit-user-select: none;  /* Chrome all / Safari all */\r\n    -moz-user-select: none;     /* Firefox all */\r\n    -ms-user-select: none;      /* IE 10+ */\r\n    user-select: none;          /* Likely future */\r\n    min-height: 24px;\r\n    background-color: transparent;\r\n    color: #CCCCCC;\r\n    box-sizing: border-box;\r\n    padding-top: 3px;\r\n    text-align: center;\r\n    border-radius: 125px;\r\n    border:2px solid #555;\r\n    cursor: pointer;\r\n    padding-bottom: 3px;\r\n    display:block;\r\n}\r\n\r\n.sidebar__button-input.plus, .sidebar__button-input.minus {\r\n    display: inline-block;\r\n    min-width: 20px;\r\n}\r\n\r\n.sidebar__button-input:hover {\r\n  background-color: #333;\r\n  border:2px solid var(--sidebar-color);\r\n}\r\n\r\n/*\r\n * VALUE DISPLAY (shows a value)\r\n */\r\n\r\n.sidebar__value-display {}\r\n\r\n/*\r\n * SLIDER\r\n */\r\n\r\n.sidebar__slider {\r\n    --sidebar-slider-input-height: 3px;\r\n}\r\n\r\n.sidebar__slider-input-wrapper {\r\n    width: 100%;\r\n\r\n    margin-top: 8px;\r\n    position: relative;\r\n}\r\n\r\n.sidebar__slider-input {\r\n    -webkit-appearance: none;\r\n    appearance: none;\r\n    margin: 0;\r\n    width: 100%;\r\n    height: var(--sidebar-slider-input-height);\r\n    background: #555;\r\n    cursor: pointer;\r\n    /*outline: 0;*/\r\n\r\n    -webkit-transition: .2s;\r\n    transition: background-color .2s;\r\n    border: none;\r\n}\r\n\r\n.sidebar__slider-input:focus, .sidebar__slider-input:hover {\r\n    border: none;\r\n}\r\n\r\n.sidebar__slider-input-active-track {\r\n    user-select: none;\r\n    position: absolute;\r\n    z-index: 11;\r\n    top: 0;\r\n    left: 0;\r\n    background-color: var(--sidebar-color);\r\n    pointer-events: none;\r\n    height: var(--sidebar-slider-input-height);\r\n    max-width: 100%;\r\n}\r\n\r\n/* Mouse-over effects */\r\n.sidebar__slider-input:hover {\r\n    /*background-color: #444444;*/\r\n}\r\n\r\n/*.sidebar__slider-input::-webkit-progress-value {*/\r\n/*    background-color: green;*/\r\n/*    color:green;*/\r\n\r\n/*    }*/\r\n\r\n/* The slider handle (use -webkit- (Chrome, Opera, Safari, Edge) and -moz- (Firefox) to override default look) */\r\n\r\n.sidebar__slider-input::-moz-range-thumb\r\n{\r\n    position: absolute;\r\n    height: 15px;\r\n    width: 15px;\r\n    z-index: 900 !important;\r\n    border-radius: 20px !important;\r\n    cursor: pointer;\r\n    background: var(--sidebar-color) !important;\r\n    user-select: none;\r\n\r\n}\r\n\r\n.sidebar__slider-input::-webkit-slider-thumb\r\n{\r\n    position: relative;\r\n    appearance: none;\r\n    -webkit-appearance: none;\r\n    user-select: none;\r\n    height: 15px;\r\n    width: 15px;\r\n    display: block;\r\n    z-index: 900 !important;\r\n    border: 0;\r\n    border-radius: 20px !important;\r\n    cursor: pointer;\r\n    background: #777 !important;\r\n}\r\n\r\n.sidebar__slider-input:hover ::-webkit-slider-thumb {\r\n    background-color: #EEEEEE !important;\r\n}\r\n\r\n/*.sidebar__slider-input::-moz-range-thumb {*/\r\n\r\n/*    width: 0 !important;*/\r\n/*    height: var(--sidebar-slider-input-height);*/\r\n/*    background: #EEEEEE;*/\r\n/*    cursor: pointer;*/\r\n/*    border-radius: 0 !important;*/\r\n/*    border: none;*/\r\n/*    outline: 0;*/\r\n/*    z-index: 100 !important;*/\r\n/*}*/\r\n\r\n.sidebar__slider-input::-moz-range-track {\r\n    background-color: transparent;\r\n    z-index: 11;\r\n}\r\n\r\n.sidebar__slider input[type=text],\r\n.sidebar__slider input[type=paddword]\r\n{\r\n    box-sizing: border-box;\r\n    /*background-color: #333333;*/\r\n    text-align: right;\r\n    color: #BBBBBB;\r\n    display: inline-block;\r\n    background-color: transparent !important;\r\n\r\n    width: 40%;\r\n    height: 18px;\r\n    /*outline: none;*/\r\n    border: none;\r\n    border-radius: 0;\r\n    padding: 0 0 0 4px !important;\r\n    margin: 0;\r\n}\r\n\r\n.sidebar__slider input[type=text]:active,\r\n.sidebar__slider input[type=text]:focus,\r\n.sidebar__slider input[type=text]:hover\r\n.sidebar__slider input[type=password]:active,\r\n.sidebar__slider input[type=password]:focus,\r\n.sidebar__slider input[type=password]:hover\r\n{\r\n\r\n    color: #EEEEEE;\r\n}\r\n\r\n/*\r\n * TEXT / DESCRIPTION\r\n */\r\n\r\n.sidebar__text .sidebar__item-label {\r\n    width: auto;\r\n    display: block;\r\n    max-height: none;\r\n    margin-right: 0;\r\n    line-height: 1.1em;\r\n}\r\n\r\n/*\r\n * SIDEBAR INPUT\r\n */\r\n.sidebar__text-input textarea,\r\n.sidebar__text-input input[type=date],\r\n.sidebar__text-input input[type=datetime-local],\r\n.sidebar__text-input input[type=text],\r\n.sidebar__text-input input[type=password] {\r\n    box-sizing: border-box;\r\n    background-color: #333333;\r\n    color: #BBBBBB;\r\n    display: inline-block;\r\n    width: 50%;\r\n    height: 18px;\r\n\r\n\r\n    border: none;\r\n    border-radius: 0;\r\n    border:1px solid #666;\r\n    padding: 0 0 0 4px !important;\r\n    margin: 0;\r\n    color-scheme: dark;\r\n}\r\n\r\n.sidebar__text-input textarea:focus::placeholder {\r\n  color: transparent;\r\n}\r\n\r\n\r\n\r\n\r\n\r\n.sidebar__color-picker .sidebar__item-label\r\n{\r\n    width:45%;\r\n}\r\n\r\n.sidebar__text-input textarea,\r\n.sidebar__text-input input[type=text]:active,\r\n.sidebar__text-input input[type=text]:focus,\r\n.sidebar__text-input input[type=text]:hover,\r\n.sidebar__text-input input[type=password]:active,\r\n.sidebar__text-input input[type=password]:focus,\r\n.sidebar__text-input input[type=password]:hover {\r\n    background-color: transparent;\r\n    color: #EEEEEE;\r\n\r\n}\r\n\r\n.sidebar__text-input textarea\r\n{\r\n    margin-top:10px;\r\n    height:60px;\r\n    width:100%;\r\n}\r\n\r\n/*\r\n * SIDEBAR SELECT\r\n */\r\n\r\n\r\n\r\n .sidebar__select {}\r\n .sidebar__select-select {\r\n    color: #BBBBBB;\r\n    /*-webkit-appearance: none;*/\r\n    /*-moz-appearance: none;*/\r\n    appearance: none;\r\n    /*box-sizing: border-box;*/\r\n    width: 50%;\r\n    /*height: 20px;*/\r\n    background-color: #333333;\r\n    /*background-image: url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM4ODg4ODgiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBjbGFzcz0iZmVhdGhlciBmZWF0aGVyLWNoZXZyb24tZG93biI+PHBvbHlsaW5lIHBvaW50cz0iNiA5IDEyIDE1IDE4IDkiPjwvcG9seWxpbmU+PC9zdmc+);*/\r\n    background-repeat: no-repeat;\r\n    background-position: right center;\r\n    background-size: 16px 16px;\r\n    margin: 0;\r\n    /*padding: 0 2 2 6px;*/\r\n    border-radius: 5px;\r\n    border: 1px solid #777;\r\n    background-color: #444;\r\n    cursor: pointer;\r\n    /*outline: none;*/\r\n    padding-left: 5px;\r\n\r\n }\r\n\r\n.sidebar__select-select:hover,\r\n.sidebar__select-select:active,\r\n.sidebar__select-select:inactive {\r\n    background-color: #444444;\r\n    color: #EEEEEE;\r\n}\r\n\r\n/*.sidebar__select-select option*/\r\n/*{*/\r\n/*    background-color: #444444;*/\r\n/*    color: #bbb;*/\r\n/*}*/\r\n\r\n.sidebar__select-select option:checked\r\n{\r\n    background-color: #000;\r\n    color: #FFF;\r\n}\r\n\r\n\r\n/*\r\n * COLOR PICKER\r\n */\r\n\r\n\r\n .sidebar__color-picker input[type=text] {\r\n    box-sizing: border-box;\r\n    background-color: #333333;\r\n    color: #BBBBBB;\r\n    display: inline-block;\r\n    width: calc(50% - 21px); /* 50% minus space of picker circle */\r\n    height: 18px;\r\n    /*outline: none;*/\r\n    border: none;\r\n    border-radius: 0;\r\n    padding: 0 0 0 4px !important;\r\n    margin: 0;\r\n    margin-right: 7px;\r\n}\r\n\r\n.sidebar__color-picker input[type=text]:active,\r\n.sidebar__color-picker input[type=text]:focus,\r\n.sidebar__color-picker input[type=text]:hover {\r\n    background-color: #444444;\r\n    color: #EEEEEE;\r\n}\r\n\r\ndiv.sidebar__color-picker-color-input,\r\n.sidebar__color-picker input[type=color],\r\n.sidebar__palette-picker input[type=color] {\r\n    display: inline-block;\r\n    border-radius: 100%;\r\n    height: 14px;\r\n    width: 14px;\r\n\r\n    padding: 0;\r\n    border: none;\r\n    /*border:2px solid red;*/\r\n    border-color: transparent;\r\n    outline: none;\r\n    background: none;\r\n    appearance: none;\r\n    -moz-appearance: none;\r\n    -webkit-appearance: none;\r\n    cursor: pointer;\r\n    position: relative;\r\n    top: 3px;\r\n}\r\n.sidebar__color-picker input[type=color]:focus,\r\n.sidebar__palette-picker input[type=color]:focus {\r\n    outline: none;\r\n}\r\n.sidebar__color-picker input[type=color]::-moz-color-swatch,\r\n.sidebar__palette-picker input[type=color]::-moz-color-swatch {\r\n    border: none;\r\n}\r\n.sidebar__color-picker input[type=color]::-webkit-color-swatch-wrapper,\r\n.sidebar__palette-picker input[type=color]::-webkit-color-swatch-wrapper {\r\n    padding: 0;\r\n}\r\n.sidebar__color-picker input[type=color]::-webkit-color-swatch,\r\n.sidebar__palette-picker input[type=color]::-webkit-color-swatch {\r\n    border: none;\r\n    border-radius: 100%;\r\n}\r\n\r\n/*\r\n * Palette Picker\r\n */\r\n.sidebar__palette-picker .sidebar__palette-picker-color-input.first {\r\n    margin-left: 0;\r\n}\r\n.sidebar__palette-picker .sidebar__palette-picker-color-input.last {\r\n    margin-right: 0;\r\n}\r\n.sidebar__palette-picker .sidebar__palette-picker-color-input {\r\n    margin: 0 4px;\r\n}\r\n\r\n.sidebar__palette-picker .circlebutton {\r\n    width: 14px;\r\n    height: 14px;\r\n    border-radius: 1em;\r\n    display: inline-block;\r\n    top: 3px;\r\n    position: relative;\r\n}\r\n\r\n/*\r\n * Preset\r\n */\r\n.sidebar__item-presets-preset\r\n{\r\n    padding:4px;\r\n    cursor:pointer;\r\n    padding-left:8px;\r\n    padding-right:8px;\r\n    margin-right:4px;\r\n    background-color:#444;\r\n}\r\n\r\n.sidebar__item-presets-preset:hover\r\n{\r\n    background-color:#666;\r\n}\r\n\r\n.sidebar__greyout\r\n{\r\n    background: #222;\r\n    opacity: 0.8;\r\n    width: 100%;\r\n    height: 100%;\r\n    position: absolute;\r\n    z-index: 1000;\r\n    right: 0;\r\n    top: 0;\r\n}\r\n\r\n.sidebar_tabs\r\n{\r\n    background-color: #151515;\r\n    padding-bottom: 0px;\r\n}\r\n\r\n.sidebar_switchs\r\n{\r\n    float: right;\r\n}\r\n\r\n.sidebar_tab\r\n{\r\n    float:left;\r\n    background-color: #151515;\r\n    border-bottom:1px solid transparent;\r\n    padding-right:7px;\r\n    padding-left:7px;\r\n    padding-bottom: 5px;\r\n    padding-top: 5px;\r\n    cursor:pointer;\r\n}\r\n\r\n.sidebar_tab_active\r\n{\r\n    background-color: #272727;\r\n    color:white;\r\n}\r\n\r\n.sidebar_tab:hover\r\n{\r\n    border-bottom:1px solid #777;\r\n    color:white;\r\n}\r\n\r\n\r\n.sidebar_switch\r\n{\r\n    float:left;\r\n    background-color: #444;\r\n    padding-right:7px;\r\n    padding-left:7px;\r\n    padding-bottom: 5px;\r\n    padding-top: 5px;\r\n    cursor:pointer;\r\n}\r\n\r\n.sidebar_switch:last-child\r\n{\r\n    border-top-right-radius: 7px;\r\n    border-bottom-right-radius: 7px;\r\n}\r\n\r\n.sidebar_switch:first-child\r\n{\r\n    border-top-left-radius: 7px;\r\n    border-bottom-left-radius: 7px;\r\n}\r\n\r\n\r\n.sidebar_switch_active\r\n{\r\n    background-color: #999;\r\n    color:white;\r\n}\r\n\r\n.sidebar_switch:hover\r\n{\r\n    color:white;\r\n}\r\n\r\n.sidebar__text-input-input::focus-visible,\r\n/*.sidebar__text-input-input:active,*/\r\n.sidebar__button-input:focus-visible,\r\n.sidebar__text-input:focus-visible\r\n/*.sidebar__text-input:active*/\r\n{\r\n    outline-style: solid;\r\n    outline-color:white;\r\n    outline-width: 1px;\r\n\r\n}\r\n\r\n",};
// vars
const CSS_ELEMENT_CLASS = "cables-sidebar-style"; /* class for the style element to be generated */
const CSS_ELEMENT_DYNAMIC_CLASS = "cables-sidebar-dynamic-style"; /* things which can be set via op-port, but not attached to the elements themselves, e.g. minimized opacity */
const SIDEBAR_CLASS = "sidebar-cables";
const SIDEBAR_ID = "sidebar" + CABLES.uuid();
const SIDEBAR_ITEMS_CLASS = "sidebar__items";
const SIDEBAR_OPEN_CLOSE_BTN_CLASS = "sidebar__close-button";

const BTN_TEXT_OPEN = ""; // 'Close';
const BTN_TEXT_CLOSED = ""; // 'Show Controls';

let openCloseBtn = null;
let openCloseBtnIcon = null;
let headerTitleText = null;

// inputs
const visiblePort = op.inValueBool("Visible", true);
const opacityPort = op.inValueSlider("Opacity", 1);
const defaultMinimizedPort = op.inValueBool("Default Minimized");
const minimizedOpacityPort = op.inValueSlider("Minimized Opacity", 0.5);
const undoButtonPort = op.inValueBool("Show undo button", false);
const inMinimize = op.inValueBool("Show Minimize", false);

const inTitle = op.inString("Title", "");
const side = op.inValueBool("Side");
const addCss = op.inValueBool("Default CSS", true);

let doc = op.patch.cgl.canvas.ownerDocument;

// outputs
const childrenPort = op.outObject("childs");
childrenPort.setUiAttribs({ "title": "Children" });

const isOpenOut = op.outBool("Opfened");
isOpenOut.setUiAttribs({ "title": "Opened" });

let sidebarEl = doc.querySelector("." + SIDEBAR_ID);
if (!sidebarEl) sidebarEl = initSidebarElement();

const sidebarItemsEl = sidebarEl.querySelector("." + SIDEBAR_ITEMS_CLASS);
childrenPort.set({
    "parentElement": sidebarItemsEl,
    "parentOp": op,
});
onDefaultMinimizedPortChanged();
initSidebarCss();
updateDynamicStyles();

addCss.onChange = () =>
{
    initSidebarCss();
    updateDynamicStyles();
};
visiblePort.onChange = onVisiblePortChange;
opacityPort.onChange = onOpacityPortChange;
defaultMinimizedPort.onChange = onDefaultMinimizedPortChanged;
minimizedOpacityPort.onChange = onMinimizedOpacityPortChanged;
undoButtonPort.onChange = onUndoButtonChange;
op.onDelete = onDelete;

function onMinimizedOpacityPortChanged()
{
    updateDynamicStyles();
}

inMinimize.onChange = updateMinimize;

function updateMinimize(header)
{
    if (!header || header.uiAttribs) header = doc.querySelector(".sidebar-cables .sidebar__group-header");
    if (!header) return;

    const undoButton = doc.querySelector(".sidebar-cables .sidebar__group-header .sidebar__group-header-undo");

    if (inMinimize.get())
    {
        header.classList.add("iconsidebar-chevron-up");
        header.classList.add("iconsidebar-minimizebutton");

        if (undoButton)undoButton.style.marginRight = "20px";
    }
    else
    {
        header.classList.remove("iconsidebar-chevron-up");
        header.classList.remove("iconsidebar-minimizebutton");

        if (undoButton)undoButton.style.marginRight = "initial";
    }
}

side.onChange = function ()
{
    if (!sidebarEl) return;
    if (side.get()) sidebarEl.classList.add("sidebar-cables-right");
    else sidebarEl.classList.remove("sidebar-cables-right");
};

function onUndoButtonChange()
{
    const header = doc.querySelector(".sidebar-cables .sidebar__group-header");
    if (header)
    {
        initUndoButton(header);
    }
}

function initUndoButton(header)
{
    if (header)
    {
        const undoButton = doc.querySelector(".sidebar-cables .sidebar__group-header .sidebar__group-header-undo");
        if (undoButton)
        {
            if (!undoButtonPort.get())
            {
                // header.removeChild(undoButton);
                undoButton.remove();
            }
        }
        else
        {
            if (undoButtonPort.get())
            {
                const headerUndo = doc.createElement("span");
                headerUndo.classList.add("sidebar__group-header-undo");
                headerUndo.classList.add("sidebar-icon-undo");

                headerUndo.addEventListener("click", function (event)
                {
                    event.stopPropagation();
                    const reloadables = doc.querySelectorAll(".sidebar-cables .sidebar__reloadable");
                    const doubleClickEvent = doc.createEvent("MouseEvents");
                    doubleClickEvent.initEvent("dblclick", true, true);
                    reloadables.forEach((reloadable) =>
                    {
                        reloadable.dispatchEvent(doubleClickEvent);
                    });
                });
                header.appendChild(headerUndo);
            }
        }
    }
    updateMinimize(header);
}

function onDefaultMinimizedPortChanged()
{
    if (!openCloseBtn) { return; }
    if (defaultMinimizedPort.get())
    {
        sidebarEl.classList.add("sidebar--closed");
        if (visiblePort.get()) isOpenOut.set(false);
    }
    else
    {
        sidebarEl.classList.remove("sidebar--closed");
        if (visiblePort.get()) isOpenOut.set(true);
    }
}

function onOpacityPortChange()
{
    const opacity = opacityPort.get();
    sidebarEl.style.opacity = opacity;
}

function onVisiblePortChange()
{
    if (!sidebarEl) return;
    if (visiblePort.get())
    {
        sidebarEl.style.display = "block";
        if (!sidebarEl.classList.contains("sidebar--closed")) isOpenOut.set(true);
    }
    else
    {
        sidebarEl.style.display = "none";
        isOpenOut.set(false);
    }
}

side.onChanged = function ()
{

};

/**
 * Some styles cannot be set directly inline, so a dynamic stylesheet is needed.
 * Here hover states can be set later on e.g.
 */
function updateDynamicStyles()
{
    const dynamicStyles = doc.querySelectorAll("." + CSS_ELEMENT_DYNAMIC_CLASS);
    if (dynamicStyles)
    {
        dynamicStyles.forEach(function (e)
        {
            e.parentNode.removeChild(e);
        });
    }

    if (!addCss.get()) return;

    const newDynamicStyle = doc.createElement("style");
    newDynamicStyle.classList.add("cablesEle");
    newDynamicStyle.classList.add(CSS_ELEMENT_DYNAMIC_CLASS);
    let cssText = ".sidebar--closed .sidebar__close-button { ";
    cssText += "opacity: " + minimizedOpacityPort.get();
    cssText += "}";
    const cssTextEl = doc.createTextNode(cssText);
    newDynamicStyle.appendChild(cssTextEl);
    doc.body.appendChild(newDynamicStyle);
}

function initSidebarElement()
{
    const element = doc.createElement("div");
    element.classList.add(SIDEBAR_CLASS);
    element.classList.add(SIDEBAR_ID);
    const canvasWrapper = op.patch.cgl.canvas.parentElement; /* maybe this is bad outside cables!? */

    // header...
    const headerGroup = doc.createElement("div");
    headerGroup.classList.add("sidebar__group");

    element.appendChild(headerGroup);
    const header = doc.createElement("div");
    header.classList.add("sidebar__group-header");

    element.appendChild(header);
    const headerTitle = doc.createElement("span");
    headerTitle.classList.add("sidebar__group-header-title");
    headerTitleText = doc.createElement("span");
    headerTitleText.classList.add("sidebar__group-header-title-text");
    headerTitleText.innerHTML = inTitle.get();
    headerTitle.appendChild(headerTitleText);
    header.appendChild(headerTitle);

    initUndoButton(header);
    updateMinimize(header);

    headerGroup.appendChild(header);
    element.appendChild(headerGroup);
    headerGroup.addEventListener("click", onOpenCloseBtnClick);

    if (!canvasWrapper)
    {
        op.warn("[sidebar] no canvas parentelement found...");
        return;
    }
    canvasWrapper.appendChild(element);
    const items = doc.createElement("div");
    items.classList.add(SIDEBAR_ITEMS_CLASS);
    element.appendChild(items);
    openCloseBtn = doc.createElement("div");
    openCloseBtn.classList.add(SIDEBAR_OPEN_CLOSE_BTN_CLASS);
    openCloseBtn.addEventListener("click", onOpenCloseBtnClick);
    element.appendChild(openCloseBtn);

    return element;
}

inTitle.onChange = function ()
{
    if (headerTitleText)headerTitleText.innerHTML = inTitle.get();
};

function setClosed(b)
{

}

function onOpenCloseBtnClick(ev)
{
    ev.stopPropagation();
    if (!sidebarEl) { op.logError("Sidebar could not be closed..."); return; }
    sidebarEl.classList.toggle("sidebar--closed");
    const btn = ev.target;
    let btnText = BTN_TEXT_OPEN;
    if (sidebarEl.classList.contains("sidebar--closed"))
    {
        btnText = BTN_TEXT_CLOSED;
        isOpenOut.set(false);
    }
    else
    {
        isOpenOut.set(true);
    }
}

function initSidebarCss()
{
    const cssElements = doc.querySelectorAll("." + CSS_ELEMENT_CLASS);
    // remove old script tag
    if (cssElements)
    {
        cssElements.forEach((e) =>
        {
            e.parentNode.removeChild(e);
        });
    }

    if (!addCss.get()) return;

    const newStyle = doc.createElement("style");

    newStyle.innerHTML = attachments.style_css;
    newStyle.classList.add(CSS_ELEMENT_CLASS);
    newStyle.classList.add("cablesEle");
    doc.body.appendChild(newStyle);
}

function onDelete()
{
    removeElementFromDOM(sidebarEl);
}

function removeElementFromDOM(el)
{
    if (el && el.parentNode && el.parentNode.removeChild) el.parentNode.removeChild(el);
}

}
};

CABLES.OPS["5a681c35-78ce-4cb3-9858-bc79c34c6819"]={f:Ops.Sidebar.Sidebar,objName:"Ops.Sidebar.Sidebar"};




// **************************************************************
// 
// Ops.Html.Elements.DivElement_v3
// 
// **************************************************************

Ops.Html.Elements.DivElement_v3= class extends CABLES.Op 
{
constructor()
{
super(...arguments);
const op=this;
const attachments=op.attachments={};
const
    inText = op.inString("Text", "Hello Div"),
    inId = op.inString("Id"),
    inClass = op.inString("Class"),
    inStyle = op.inStringEditor("Style", "position:absolute;\nz-index:100;", "inline-css"),
    inInteractive = op.inValueBool("Interactive", false),
    inVisible = op.inValueBool("Visible", true),
    inBreaks = op.inValueBool("Convert Line Breaks", false),
    inPropagation = op.inValueBool("Propagate Click-Events", true),
    outElement = op.outObject("DOM Element", null, "element"),
    outHover = op.outBoolNum("Hover"),
    outClicked = op.outTrigger("Clicked");

let listenerElement = null;
let oldStr = null;
let prevDisplay = "block";
let div = null;

const canvas = op.patch.cgl.canvas.parentElement;

createElement();

inClass.onChange = updateClass;
inBreaks.onChange = inText.onChange = updateText;
inStyle.onChange = updateStyle;
inInteractive.onChange = updateInteractive;
inVisible.onChange = updateVisibility;

updateText();
updateStyle();
warning();
updateInteractive();

op.onDelete = removeElement;

outElement.onLinkChanged = updateStyle;

inInteractive.onLinkChanged =
outClicked.onLinkChanged = () =>
{
    op.setUiError("interactiveProblem", null);
    if (outClicked.isLinked() && !inInteractive.get() && !inInteractive.isLinked())
        op.setUiError("interactiveProblem", "Interactive should be activated when linking clicked port");
};

function createElement()
{
    div = op.patch.getDocument().createElement("div");
    div.dataset.op = op.id;
    div.classList.add("cablesEle");

    if (inId.get()) div.id = inId.get();

    canvas.appendChild(div);
    outElement.setRef(div);
}

function removeElement()
{
    if (div) removeClasses();
    if (div && div.parentNode) div.parentNode.removeChild(div);
    oldStr = null;
    div = null;
}

function setCSSVisible(visible)
{
    if (!visible)
    {
        div.style.visibility = "hidden";
        prevDisplay = div.style.display || "inherit";
        div.style.display = "none";
    }
    else
    {
        // prevDisplay=div.style.display||'inherit';
        if (prevDisplay == "none") prevDisplay = "inherit";
        div.style.visibility = "visible";
        div.style.display = prevDisplay;
    }
}

function updateVisibility()
{
    setCSSVisible(inVisible.get());
}

function updateText()
{
    let str = inText.get();

    if (oldStr === str) return;
    oldStr = str;

    if (str && inBreaks.get()) str = str.replace(/(?:\r\n|\r|\n)/g, "<br>");

    if (div.innerHTML != str) div.innerHTML = str;

    outElement.setRef(div);
}

// inline css inisde div
function updateStyle()
{
    if (!div) return;
    // if (inStyle.get() != div.style)
    // {
    div.setAttribute("style", inStyle.get());
    updateVisibility();
    outElement.setRef(div);
    // }

    if (!div.parentElement) canvas.appendChild(div);

    warning();
}

let oldClassesStr = "";

function removeClasses()
{
    if (!div) return;

    const classes = (inClass.get() || "").split(" ");
    for (let i = 0; i < classes.length; i++)
    {
        if (classes[i]) div.classList.remove(classes[i]);
    }
    oldClassesStr = "";
}

function updateClass()
{
    const classes = (inClass.get() || "").split(" ");
    const oldClasses = (oldClassesStr || "").split(" ");

    let found = false;

    for (let i = 0; i < oldClasses.length; i++)
    {
        if (
            oldClasses[i] &&
            classes.indexOf(oldClasses[i].trim()) == -1)
        {
            found = true;
            div.classList.remove(oldClasses[i]);
        }
    }

    for (let i = 0; i < classes.length; i++)
    {
        if (classes[i])
        {
            div.classList.add(classes[i].trim());
        }
    }

    oldClassesStr = inClass.get();
    warning();
}

function onMouseEnter(e)
{
    outHover.set(true);
}

function onMouseLeave(e)
{
    outHover.set(false);
}

function onMouseClick(e)
{
    if (!inPropagation.get())
    {
        e.stopPropagation();
    }
    outClicked.trigger();
}

function updateInteractive()
{
    op.setUiError("interactiveProblem", null);

    removeListeners();
    if (inInteractive.get()) addListeners();
}

inId.onChange = function ()
{
    div.id = inId.get();
};

function removeListeners()
{
    if (listenerElement)
    {
        listenerElement.removeEventListener("pointerdown", onMouseClick);
        listenerElement.removeEventListener("pointerleave", onMouseLeave);
        listenerElement.removeEventListener("pointerenter", onMouseEnter);
        listenerElement = null;
    }
}

function addListeners()
{
    if (listenerElement)removeListeners();

    listenerElement = div;

    if (listenerElement)
    {
        listenerElement.addEventListener("pointerdown", onMouseClick);
        listenerElement.addEventListener("pointerleave", onMouseLeave);
        listenerElement.addEventListener("pointerenter", onMouseEnter);
    }
}

op.addEventListener("onEnabledChange", function (enabled)
{
    removeElement();
    if (enabled)
    {
        createElement();
        updateStyle();
        updateClass();
        updateText();
        updateInteractive();
    }
    // if(enabled) updateVisibility();
    // else setCSSVisible(false);
});

function warning()
{
    if (inClass.get() && inStyle.get())
    {
        op.setUiError("error", "Element uses external and inline CSS", 1);
    }
    else
    {
        op.setUiError("error", null);
    }
}

}
};

CABLES.OPS["d55d398c-e68e-486b-b0ce-d9c4bdf7df05"]={f:Ops.Html.Elements.DivElement_v3,objName:"Ops.Html.Elements.DivElement_v3"};




// **************************************************************
// 
// Ops.Sidebar.Toggle_v4
// 
// **************************************************************

Ops.Sidebar.Toggle_v4= class extends CABLES.Op 
{
constructor()
{
super(...arguments);
const op=this;
const attachments=op.attachments={};
const
    parentPort = op.inObject("link"),
    labelPort = op.inString("Text", "Toggle"),
    inputValue = op.inBool("Input", true),
    storeDefaultValueButton = op.inTriggerButton("Set Default"),
    defaultValuePort = op.inBool("Default"),
    inGreyOut = op.inBool("Grey Out", false),
    inVisible = op.inBool("Visible", true),
    siblingsPort = op.outObject("childs"),
    valuePort = op.outBoolNum("Value", defaultValuePort.get()),
    outToggled = op.outTrigger("Toggled");

defaultValuePort.setUiAttribs({ "hidePort": true, "greyout": true });

const classNameActive = "sidebar__toggle--active";

const el = document.createElement("div");
el.dataset.op = op.id;
el.classList.add("cablesEle");
el.classList.add("sidebar__item");
el.classList.add("sidebar__toggle");
el.classList.add("sidebar__reloadable");
el.classList.add(classNameActive);

const labelText = document.createTextNode(labelPort.get());
const label = document.createElement("div");
label.classList.add("sidebar__item-label");
label.appendChild(labelText);

const icon = document.createElement("a");

valuePort.set(defaultValuePort.get());

icon.classList.add("icon_toggle");
icon.addEventListener("click", onInputClick);
icon.addEventListener("keypress", onKeyPress);

icon.setAttribute("tabindex", 0);
icon.setAttribute("aria-label", "toggle " + labelPort.get());

const greyOut = document.createElement("div");
greyOut.classList.add("sidebar__greyout");
greyOut.style.display = "none";

el.appendChild(greyOut);
el.appendChild(icon);
el.appendChild(label);
el.addEventListener("dblclick", reset);

op.init = () =>
{
    reset();
    updateClass();
};
op.onDelete = onDelete;
parentPort.onChange = onParentChanged;
labelPort.onChange = onLabelTextChanged;
inputValue.onChange = onInputValueChanged;
storeDefaultValueButton.onTriggered = storeDefaultValue;

function reset()
{
    valuePort.set(defaultValuePort.get());
    inputValue.set(defaultValuePort.get());
    outToggled.trigger();
}

function storeDefaultValue()
{
    const defaultValue = inputValue.get();

    defaultValuePort.set(defaultValue);
    valuePort.set(defaultValue);
    outToggled.trigger();
    op.refreshParams();
}

function updateClass()
{
    const isActive = valuePort.get();
    if (isActive)
    {
        icon.classList.add("icon_toggle_true");
        icon.classList.remove("icon_toggle_false");
    }
    else
    {
        icon.classList.remove("icon_toggle_true");
        icon.classList.add("icon_toggle_false");
    }
}

function onKeyPress(e)
{
    if (e.code === "Enter") onInputClick();
}

function onInputClick()
{
    el.classList.toggle(classNameActive);

    const isActive = el.classList.contains(classNameActive);
    valuePort.set(isActive);
    inputValue.set(isActive);

    updateClass();
    outToggled.trigger();
    op.refreshParams();
}

function onInputValueChanged()
{
    if (inputValue.get()) el.classList.add(classNameActive);
    else el.classList.remove(classNameActive);

    valuePort.set(inputValue.get());
    outToggled.trigger();
}

function onLabelTextChanged()
{
    const text = labelPort.get();
    label.textContent = text;
    icon.setAttribute("aria-label", "toggle " + labelPort.get());
    if (CABLES.UI) op.setUiAttrib({ "extendTitle": text });
}

function onParentChanged()
{
    siblingsPort.set(null);
    const parent = parentPort.get();
    if (parent && parent.parentElement)
    {
        parent.parentElement.appendChild(el);
        siblingsPort.set(parent);
    }
    else if (el.parentElement) el.parentElement.removeChild(el);
}

function showElement(element)
{
    if (element) element.style.display = "block";
}

function hideElement(element)
{
    if (element) element.style.display = "none";
}

function onDelete()
{
    if (el && el.parentNode && el.parentNode.removeChild) el.parentNode.removeChild(el);
}

inGreyOut.onChange = function ()
{
    greyOut.style.display = inGreyOut.get() ? "block" : "none";
};

inVisible.onChange = function ()
{
    el.style.display = inVisible.get() ? "block" : "none";
};

}
};

CABLES.OPS["247f5aaf-6438-4a37-9649-4c0fe9cc78c9"]={f:Ops.Sidebar.Toggle_v4,objName:"Ops.Sidebar.Toggle_v4"};




// **************************************************************
// 
// Ops.Html.CSS.CSS_v3
// 
// **************************************************************

Ops.Html.CSS.CSS_v3= class extends CABLES.Op 
{
constructor()
{
super(...arguments);
const op=this;
const attachments=op.attachments={};
const
    code = op.inStringEditor("css code"),
    nest = op.inString("Nesting Parent", ""),
    inActive = op.inBool("Active", true);

code.setUiAttribs(
    {
        "editorSyntax": "css",
        "ignoreBigPort": true
    });

let styleEle = null;
const eleId = "css_" + CABLES.uuid();

nest.onChange =
code.onChange = update;
update();

inActive.onChange = () =>
{
    if (!inActive.get())styleEle.remove();
    else addElement();
};

function getCssContent()
{
    let css = code.get();

    if (nest.get())
    {
        css = nest.get() + "\n{\n" + css + "\n}\n";
    }

    if (css)
        css = css.replace(new RegExp("{{ASSETPATH}}", "g"), op.patch.getAssetPath());

    return css;
}

function update()
{
    styleEle = op.patch.getDocument().getElementById(eleId);

    if (styleEle)
    {
        styleEle.textContent = getCssContent();
    }
    else
    {
        styleEle = op.patch.getDocument().createElement("style");
        styleEle.type = "text/css";
        styleEle.id = eleId;
        styleEle.textContent = attachments.css_spinner;
        styleEle.classList.add("cablesEle");
        addElement();
    }
}

function addElement()
{
    const head = op.patch.getDocument().getElementsByTagName("body")[0];
    head.appendChild(styleEle);
}

op.onDelete = function ()
{
    styleEle = op.patch.getDocument().getElementById(eleId);
    if (styleEle)styleEle.remove();
};

}
};

CABLES.OPS["aa44a0e9-b9fe-4eed-93a3-38e41a91b623"]={f:Ops.Html.CSS.CSS_v3,objName:"Ops.Html.CSS.CSS_v3"};




// **************************************************************
// 
// Ops.Math.Sum
// 
// **************************************************************

Ops.Math.Sum= class extends CABLES.Op 
{
constructor()
{
super(...arguments);
const op=this;
const attachments=op.attachments={};
const
    number1 = op.inValueFloat("number1", 0),
    number2 = op.inValueFloat("number2", 0),
    result = op.outNumber("result");

op.setUiAttribs({ "mathTitle": true });

number1.onChange =
number2.onChange = exec;
exec();

function exec()
{
    const v = number1.get() + number2.get();
    if (!isNaN(v))
        result.set(v);
}

}
};

CABLES.OPS["c8fb181e-0b03-4b41-9e55-06b6267bc634"]={f:Ops.Math.Sum,objName:"Ops.Math.Sum"};



window.addEventListener('load', function(event) {
CABLES.jsLoaded=new Event('CABLES.jsLoaded');
document.dispatchEvent(CABLES.jsLoaded);
});
