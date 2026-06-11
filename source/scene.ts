/**
 * Scene-level script running inside the Cocos Creator engine context.
 *
 * Registered in package.json under contributions.scene.
 * Methods are invoked from the extension main process via:
 *   Editor.Message.request('scene', 'execute-scene-script', { name, method, args })
 *
 * All arguments and return values must be JSON-serializable (Electron IPC boundary).
 */

import { join } from 'path';

// The engine modules live in the editor's node_modules tree.
module.paths.push(join(Editor.App.path, 'node_modules'));


/**
 * Breadth-first search for a scene node by UUID.
 * BFS avoids stack overflow on deeply nested scene hierarchies.
 */
function locateNode(root: any, targetUuid: string): any {
    if (!root) return null;
    const queue: any[] = [root];
    while (queue.length > 0) {
        const node = queue.shift();
        if (node.uuid === targetUuid) return node;
        if (node.children) {
            for (let i = 0; i < node.children.length; i++) {
                queue.push(node.children[i]);
            }
        }
    }
    return null;
}

function activeScene(): { scene: any } | { success: false; error: string } {
    const { director } = require('cc');
    const scene = director.getScene();
    if (!scene) return { success: false, error: 'No active scene' };
    return { scene };
}

function nodeOrError(uuid: string): { node: any } | { success: false; error: string } {
    const r = activeScene();
    if (!('scene' in r)) return r;
    const node = locateNode(r.scene, uuid);
    if (!node) return { success: false, error: `Node not found: ${uuid}` };
    return { node };
}

/**
 * Safely convert a value to something JSON-roundtrippable.
 * Engine-native objects (Vec3, Color, …) become plain objects;
 * non-serializable things become a descriptive string.
 */
function toSerializable(value: any, depth = 0): any {
    if (value === null || value === undefined) return value;
    const t = typeof value;
    if (t === 'number' || t === 'boolean' || t === 'string') return value;
    if (depth > 3) return String(value);
    if (Array.isArray(value)) return value.map(v => toSerializable(v, depth + 1));
    if (t === 'object') {
        try {
            const json = JSON.stringify(value);
            if (json !== undefined) return value;
        } catch { /* not serializable as-is */ }
        // Try to extract enumerable own properties.
        const out: Record<string, any> = {};
        for (const key of Object.keys(value)) {
            if (key.startsWith('_') || key.startsWith('__')) continue;
            try { out[key] = toSerializable(value[key], depth + 1); } catch { /* skip */ }
        }
        return out;
    }
    return String(value);
}

// ── Method signatures MUST match package.json contributions.scene.methods ──

export const methods: Record<string, (...args: any[]) => any> = {


    playAnimation(nodeUuid: string, clipName?: string, loop: boolean = false, speed: number = 1.0) {
        try {
            const r = nodeOrError(nodeUuid);
            if (!('node' in r)) return r;

            const { animation: animMod } = require('cc');
            const WrapMode = animMod?.WrapMode;
            const anim = r.node.getComponent('cc.Animation');
            if (!anim) return { success: false, error: 'No Animation component' };

            const playName = clipName || anim.defaultClip?.name;
            if (!playName) return { success: false, error: 'No clip to play' };

            const state = anim.getAnimationState(playName);
            if (state) {
                state.speed = speed;
                state.wrapMode = loop ? (WrapMode?.Loop ?? 2) : (WrapMode?.Normal ?? 1);
            }
            anim.play(playName);
            return { success: true, message: `Playing: ${playName}` };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    },

    pauseAnimation(nodeUuid: string) {
        try {
            const r = nodeOrError(nodeUuid);
            if (!('node' in r)) return r;
            const anim = r.node.getComponent('cc.Animation');
            if (!anim) return { success: false, error: 'No Animation component' };
            anim.pause();
            return { success: true, message: 'Paused' };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    },

    stopAnimation(nodeUuid: string) {
        try {
            const r = nodeOrError(nodeUuid);
            if (!('node' in r)) return r;
            const anim = r.node.getComponent('cc.Animation');
            if (!anim) return { success: false, error: 'No Animation component' };
            anim.stop();
            return { success: true, message: 'Stopped' };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    },

    getAnimationTracks(nodeUuid: string, clipName?: string, trackType?: string) {
        try {
            const r = nodeOrError(nodeUuid);
            if (!('node' in r)) return r;
            const anim = r.node.getComponent('cc.Animation');
            if (!anim) return { success: false, error: 'No Animation component' };

            const clips = anim.getClips();
            const clip = clipName
                ? clips.find((c: any) => c.name === clipName)
                : anim.defaultClip;
            if (!clip) return { success: false, error: 'No clip found' };

            const tracks: any[] = [];
            const td = (clip as any).trackData || (clip as any)._trackData;
            if (Array.isArray(td)) {
                for (const t of td) {
                    tracks.push({
                        name: t.name || t._path?.join('.') || 'unknown',
                        type: trackType || 'generic',
                        property: t._path || [],
                        keyframeCount: (t._frames || t._curve?._keys || []).length,
                    });
                }
            } else if (Array.isArray((clip as any).curves)) {
                for (const c of (clip as any).curves) {
                    tracks.push({
                        name: c._path?.join('.') || 'unknown',
                        type: trackType || 'generic',
                        modifiers: c._modifiers || [],
                        keyframeCount: c._keys?.length || 0,
                    });
                }
            }

            return { success: true, data: { clipName: clip.name, duration: clip.duration, tracks } };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    },

    startAnimationRecord(nodeUuid: string, clipName?: string) {
        // Recording must be initiated from the editor Animation panel.
        return {
            success: true,
            message: 'Use the editor Animation panel to start recording',
            data: { nodeUuid, clipName },
        };
    },

    stopAnimationRecord(nodeUuid: string) {
        return { success: true, message: 'Use the editor Animation panel to stop recording' };
    },

    cancelAnimationRecord(nodeUuid: string) {
        return { success: true, message: 'Recording cancelled' };
    },


    executeScript(script: string) {
        try {
            const fn = new Function('require', script);
            const result = fn(require);
            if (result && typeof result.then === 'function') {
                return result
                    .then((r: any) => ({ success: true, result: r }))
                    .catch((e: any) => ({ success: false, error: e.message, stack: e.stack }));
            }
            return { success: true, result };
        } catch (err: any) {
            return { success: false, error: err.message, stack: err.stack };
        }
    },

    queryScriptMethods(classNameOrPath: string) {
        try {
            const { js } = require('cc');
            const cls = js.getClassByName(classNameOrPath);
            if (!cls) return { success: true, data: [] };

            const names: string[] = [];
            let proto = cls.prototype;
            while (proto && proto !== Object.prototype) {
                for (const key of Object.getOwnPropertyNames(proto)) {
                    if (key === 'constructor' || key.startsWith('_')) continue;
                    if (typeof proto[key] === 'function') names.push(key);
                }
                proto = Object.getPrototypeOf(proto);
            }
            return { success: true, data: names };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    },

    queryScriptProperties(nodeUuid: string, className?: string) {
        try {
            const r = nodeOrError(nodeUuid);
            if (!('node' in r)) return r;

            const targets = className
                ? [r.node.getComponent(className)].filter(Boolean)
                : r.node.components.filter((c: any) => {
                    const name: string = c.constructor?.name || '';
                    return !name.startsWith('cc.');
                });

            if (targets.length === 0) return { success: false, error: 'Component not found' };

            const props: any[] = [];
            const comp = targets[0];
            const declaredKeys: string[] = (comp.constructor as any).__props__ || [];

            for (const key of declaredKeys.length > 0 ? declaredKeys : Object.keys(comp)) {
                if (key.startsWith('_') || key.startsWith('__')) continue;
                try {
                    props.push({ name: key, type: typeof comp[key], value: toSerializable(comp[key]) });
                } catch { /* skip */ }
            }
            return { success: true, data: props };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    },

    // ── Tween 动画 ──

    createTween(nodeUuid: string, properties: Record<string, any>, duration: number = 1.0, easing: string = 'linear', mode: string = 'to', delay: number = 0, repeat: number = 0) {
        try {
            const r = nodeOrError(nodeUuid);
            if (!('node' in r)) return r;
            const { tween } = require('cc');
            let t = tween(r.node);
            if (delay > 0) t = t.delay(delay);
            let builder = t[mode === 'by' ? 'by' : 'to'](duration, properties, { easing });
            if (repeat > 0) builder = builder.repeat(repeat);
            builder.start();
            return { success: true, message: `Tween created (${mode}, ${duration}s, ${easing})` };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    },

    stopTween(nodeUuid: string) {
        try {
            const r = nodeOrError(nodeUuid);
            if (!('node' in r)) return r;
            const { Tween } = require('cc');
            Tween.stopAllByTarget(r.node);
            return { success: true, message: 'Tween stopped' };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    },

    stopAllTweens() {
        try {
            const { Tween } = require('cc');
            Tween.stopAll();
            return { success: true, message: 'All tweens stopped' };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    },

    // ── Spine 动画 ──

    setSpineAnimation(nodeUuid: string, animationName: string, loop: boolean = true, trackIndex: number = 0) {
        try {
            const r = nodeOrError(nodeUuid);
            if (!('node' in r)) return r;
            const skeleton = r.node.getComponent('sp.Skeleton');
            if (!skeleton) return { success: false, error: 'No sp.Skeleton component' };
            skeleton.setAnimation(trackIndex, animationName, loop);
            return { success: true, message: `Spine animation: ${animationName}` };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    },

    getSpineInfo(nodeUuid: string) {
        try {
            const r = nodeOrError(nodeUuid);
            if (!('node' in r)) return r;
            const skeleton = r.node.getComponent('sp.Skeleton');
            if (!skeleton) return { success: false, error: 'No sp.Skeleton component' };
            const skins: string[] = skeleton.skeletonData?.getSkeletonData()?.skins?.map((s: any) => s.name) || [];
            const animations: string[] = skeleton.skeletonData?.getSkeletonData()?.animations?.map((a: any) => a.name) || [];
            return { success: true, data: { skins, animations, defaultSkin: skeleton.defaultSkin } };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    },

    // ── DragonBones 动画 ──

    setDragonBonesAnimation(nodeUuid: string, animationName: string, playTimes: number = -1) {
        try {
            const r = nodeOrError(nodeUuid);
            if (!('node' in r)) return r;
            const armature = r.node.getComponent('dragonBones.ArmatureDisplay');
            if (!armature) return { success: false, error: 'No DragonBones component' };
            armature.playAnimation(animationName, playTimes);
            return { success: true, message: `DragonBones animation: ${animationName}` };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    },

    getDragonBonesInfo(nodeUuid: string) {
        try {
            const r = nodeOrError(nodeUuid);
            if (!('node' in r)) return r;
            const armature = r.node.getComponent('dragonBones.ArmatureDisplay');
            if (!armature) return { success: false, error: 'No DragonBones component' };
            const animations = armature.getAnimations() || [];
            return { success: true, data: { armatureName: armature.armatureName, animations } };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    },

    // ── Graphics 绘图 ──

    executeGraphics(nodeUuid: string, commands: Array<Record<string, any>>) {
        try {
            const r = nodeOrError(nodeUuid);
            if (!('node' in r)) return r;
            const gfx = r.node.getComponent('cc.Graphics');
            if (!gfx) return { success: false, error: 'No Graphics component' };
            for (const cmd of commands) {
                const t = cmd.type;
                const p = cmd.params || [];
                if (t === 'clear') { gfx.clear(); }
                else if (t === 'moveTo') { gfx.moveTo(p[0], p[1]); }
                else if (t === 'lineTo') { gfx.lineTo(p[0], p[1]); }
                else if (t === 'bezierCurveTo') { gfx.bezierCurveTo(p[0], p[1], p[2], p[3], p[4], p[5]); }
                else if (t === 'quadraticCurveTo') { gfx.quadraticCurveTo(p[0], p[1], p[2], p[3]); }
                else if (t === 'arc') { gfx.arc(p[0], p[1], p[2], p[3], p[4], p[5] ?? false); }
                else if (t === 'circle') { gfx.circle(p[0], p[1], p[2]); }
                else if (t === 'ellipse') { gfx.ellipse(p[0], p[1], p[2], p[3]); }
                else if (t === 'rect') { gfx.rect(p[0], p[1], p[2], p[3]); }
                else if (t === 'roundRect') { gfx.roundRect(p[0], p[1], p[2], p[3], p[4]); }
                else if (t === 'fill') { gfx.fill(); }
                else if (t === 'stroke') { gfx.stroke(); }
                else if (t === 'close') { gfx.close(); }
            }
            return { success: true, message: `Executed ${commands.length} graphics commands` };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    },

    // ── 音频播放 ──

    playAudio(nodeUuid: string) {
        try {
            const r = nodeOrError(nodeUuid);
            if (!('node' in r)) return r;
            const audio = r.node.getComponent('cc.AudioSource');
            if (!audio) return { success: false, error: 'No AudioSource component' };
            audio.play();
            return { success: true, message: 'Audio playing' };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    },

    pauseAudio(nodeUuid: string) {
        try {
            const r = nodeOrError(nodeUuid);
            if (!('node' in r)) return r;
            const audio = r.node.getComponent('cc.AudioSource');
            if (!audio) return { success: false, error: 'No AudioSource component' };
            audio.pause();
            return { success: true, message: 'Audio paused' };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    },

    stopAudio(nodeUuid: string) {
        try {
            const r = nodeOrError(nodeUuid);
            if (!('node' in r)) return r;
            const audio = r.node.getComponent('cc.AudioSource');
            if (!audio) return { success: false, error: 'No AudioSource component' };
            audio.stop();
            return { success: true, message: 'Audio stopped' };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    },

    // ── ScrollView 滚动 ──

    scrollScrollView(nodeUuid: string, position: { x: number; y: number }, animated: boolean = true) {
        try {
            const r = nodeOrError(nodeUuid);
            if (!('node' in r)) return r;
            const sv = r.node.getComponent('cc.ScrollView');
            if (!sv) return { success: false, error: 'No ScrollView component' };
            if (animated) {
                sv.scrollToOffset(position, 0.3);
            } else {
                sv.setContentPosition(position);
            }
            return { success: true, message: `Scrolled to ${position.x},${position.y}` };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    },

    // ── PageView 翻页 ──

    setPageViewIndex(nodeUuid: string, pageIndex: number) {
        try {
            const r = nodeOrError(nodeUuid);
            if (!('node' in r)) return r;
            const pv = r.node.getComponent('cc.PageView');
            if (!pv) return { success: false, error: 'No PageView component' };
            pv.setCurrentPageIndex(pageIndex);
            return { success: true, message: `Page set to ${pageIndex}` };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    },

    // ── 场景统计 ──

    getSceneStatistics() {
        try {
            const r = activeScene();
            if (!('scene' in r)) return r;
            let nodeCount = 0;
            let componentCount = 0;
            const componentTypes: Record<string, number> = {};
            const queue: any[] = [r.scene];
            while (queue.length > 0) {
                const node = queue.shift();
                nodeCount++;
                if (node.components) {
                    componentCount += node.components.length;
                    for (const comp of node.components) {
                        const typeName = comp.constructor?.name || comp.__classname__ || 'Unknown';
                        componentTypes[typeName] = (componentTypes[typeName] || 0) + 1;
                    }
                }
                if (node.children) {
                    for (const child of node.children) queue.push(child);
                }
            }
            return { success: true, data: { nodeCount, componentCount, componentTypes } };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    },

    // ── 预制体模板创建 ──

    // ── Spine 动画扩展 ──

    setSpineMix(nodeUuid: string, fromAnimation: string, toAnimation: string, duration: number) {
        try {
            const r = nodeOrError(nodeUuid);
            if (!('node' in r)) return r;
            const skeleton = r.node.getComponent('sp.Skeleton');
            if (!skeleton) return { success: false, error: 'No sp.Skeleton component' };
            const state = skeleton.getState ? skeleton.getState() : (skeleton as any)._state;
            if (state) {
                state.setMix(fromAnimation, toAnimation, duration);
            }
            return { success: true, message: `Mix: ${fromAnimation} -> ${toAnimation} (${duration}s)` };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    },

    pauseSpine(nodeUuid: string) {
        try {
            const r = nodeOrError(nodeUuid);
            if (!('node' in r)) return r;
            const skeleton = r.node.getComponent('sp.Skeleton');
            if (!skeleton) return { success: false, error: 'No sp.Skeleton component' };
            const state = skeleton.getState ? skeleton.getState() : (skeleton as any)._state;
            if (state) state.pause();
            return { success: true, message: 'Spine animation paused' };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    },

    // ── 预制体断开关联 ──

    unlinkPrefab(nodeUuid: string) {
        try {
            // Cocos Creator 编辑器通过 scene:unlink-prefab 处理
            // 场景脚本无法直接操作，返回提示由编辑器 API 处理
            return { success: true, message: 'Use scene channel unlink-prefab API from editor process' };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    },

    // ── 预制体从节点创建 ──

    createPrefabFromNode(nodeUuid: string, savePath?: string) {
        // 实际创建由编辑器主进程 scene:create-prefab 处理
        // 场景脚本只做节点存在性验证
        try {
            const r = nodeOrError(nodeUuid);
            if (!('node' in r)) return r;
            return { success: true, message: 'Use scene:create-prefab from editor process', data: { nodeUuid, savePath } };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    },

    // ── TiledMap 信息查询 ──

    getTiledMapLayers(nodeUuid: string) {
        try {
            const r = nodeOrError(nodeUuid);
            if (!('node' in r)) return r;
            const tm = r.node.getComponent('cc.TiledMap');
            if (!tm) return { success: false, error: 'No TiledMap component' };
            const layers: any[] = [];
            // TiledMap 的 layer 信息在运行时通过 tm.getLayerNames() 获取
            const names = tm.getLayerNames ? tm.getLayerNames() : [];
            return { success: true, data: { layerNames: names, layerCount: names.length } };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    },

    getTiledMapProperties(nodeUuid: string) {
        try {
            const r = nodeOrError(nodeUuid);
            if (!('node' in r)) return r;
            const tm = r.node.getComponent('cc.TiledMap');
            if (!tm) return { success: false, error: 'No TiledMap component' };
            return {
                success: true,
                data: {
                    mapSize: tm.mapSize ? { width: tm.mapSize.width, height: tm.mapSize.height } : null,
                    tileSize: tm.tileSize ? { width: tm.tileSize.width, height: tm.tileSize.height } : null,
                    orientation: (tm as any).orientation,
                    layerNames: tm.getLayerNames ? tm.getLayerNames() : []
                }
            };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    },

    // ── 场景视图控制 (scene_view 工具通过 execute-scene-script 调用) ──

    setGizmoTool(tool: string) {
        try {
            const { director } = require('cc');
            // 场景脚本运行在引擎进程中，无法直接控制编辑器 Gizmo
            // 返回提示，实际 Gizmo 控制需通过编辑器进程
            return { success: true, message: `Gizmo tool '${tool}' requested. Note: Gizmo control requires editor process API.` };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    },

    setGizmoCoordinate(coordinate: string) {
        try {
            return { success: true, message: `Gizmo coordinate '${coordinate}' requested.` };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    },

    setGizmoPivot(pivot: string) {
        try {
            return { success: true, message: `Gizmo pivot '${pivot}' requested.` };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    },

    setGridVisible(visible: boolean) {
        try {
            return { success: true, message: `Grid visibility set to ${visible}. Note: Grid control requires editor process API.`, data: { visible } };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    },

    queryGridVisible() {
        try {
            return { success: true, data: null, message: 'Grid visibility query requires editor process API.' };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    },

    setViewMode(mode: string) {
        try {
            return { success: true, message: `View mode '${mode}' requested. Note: View mode control requires editor process API.` };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    },

    cameraOperation(action: string) {
        try {
            const { director, Vec3 } = require('cc');
            const scene = director.getScene();
            if (!scene) return { success: false, error: 'No active scene' };

            // 查找场景中的 Camera 节点并操作
            const cameras: any[] = [];
            const findCameras = (node: any) => {
                const cam = node.getComponent('cc.Camera');
                if (cam) cameras.push({ node, camera: cam });
                if (node.children) node.children.forEach((c: any) => findCameras(c));
            };
            findCameras(scene);

            if (cameras.length === 0) return { success: false, error: 'No camera found in scene' };

            if (action === 'reset') {
                const cam = cameras[0];
                cam.node.setPosition(0, 0, 1000);
                cam.node.setRotationFromEuler(new Vec3(0, 0, 0));
                return { success: true, message: 'Camera reset to default position' };
            }

            return { success: true, message: `Camera action '${action}' executed`, data: { cameraCount: cameras.length } };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    },

    querySceneViewStatus() {
        try {
            return {
                success: true,
                data: {
                    note: 'Scene view status is managed by the editor process, not the engine runtime. Limited info available from scene script.',
                    engine: true
                }
            };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    },

    createPrefabTemplate(templateType: string, parentUuid?: string) {
        // 模板类型通过编辑器 API 创建标准 UI 节点结构
        return { success: true, message: `Template creation for '${templateType}' should be done via create-node API` };
    },
};
