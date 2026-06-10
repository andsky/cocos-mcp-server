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
};
