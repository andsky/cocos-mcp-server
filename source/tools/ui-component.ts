// @ts-nocheck
/**
 * UI组件工具 (ui_component)
 * 统一管理 Cocos Creator 的 UI 组件操作
 *
 * 所有 set-property 调用通过基类 setSceneProperty() 统一处理 dump 格式，
 * color 类型属性显式传 'color' typeHint 确保注入 __type__: 'cc.Color'
 */

import { ToolResponse } from '../types';
import { UnifiedToolBase } from './unified-tool-base';

export class UIComponent extends UnifiedToolBase {
    name = 'ui_component';
    description = 'UI组件工具。支持操作: label(文本), sprite(精灵), button(按钮), layout(布局), widget(对齐), progress(进度条), editbox(输入框), slider(滑动条), toggle(开关)';
    actions = ['label', 'sprite', 'button', 'layout', 'widget', 'progress', 'editbox', 'slider', 'toggle'];

    getUnifiedSchema(): any {
        return {
            type: 'object',
            properties: {
                action: this.generateActionSchema(this.actions),
                uuid: { type: 'string', description: '节点UUID' },
                text: { type: 'string', description: '文本内容 (用于 label)' },
                fontSize: { type: 'number', description: '字体大小' },
                fontColor: {
                    type: 'object',
                    properties: { r: { type: 'number' }, g: { type: 'number' }, b: { type: 'number' }, a: { type: 'number', default: 255 } },
                    description: '字体颜色'
                },
                // sprite
                spriteFrame: { type: 'string', description: '精灵帧UUID或路径 (用于 sprite)' },
                sizeMode: { type: 'string', description: '尺寸模式', enum: ['CUSTOM', 'RAW', 'TRIMMED'] },
                // button
                transition: { type: 'string', description: '按钮过渡类型', enum: ['NONE', 'COLOR', 'SPRITE', 'SCALE'] },
                normalColor: { type: 'object', description: '正常状态颜色' },
                pressedColor: { type: 'object', description: '按下状态颜色' },
                // layout
                layoutType: { type: 'string', description: '布局类型', enum: ['NONE', 'HORIZONTAL', 'VERTICAL', 'GRID'] },
                resizeMode: { type: 'string', description: '调整模式', enum: ['NONE', 'CHILDREN', 'CONTAINER'] },
                // widget - 全部对齐参数
                isAlignTop: { type: 'boolean', description: '是否顶部对齐' },
                isAlignBottom: { type: 'boolean', description: '是否底部对齐' },
                isAlignLeft: { type: 'boolean', description: '是否左对齐' },
                isAlignRight: { type: 'boolean', description: '是否右对齐' },
                isAlignHCenter: { type: 'boolean', description: '是否水平居中' },
                isAlignVCenter: { type: 'boolean', description: '是否垂直居中' },
                top: { type: 'number', description: '顶部距离' },
                bottom: { type: 'number', description: '底部距离' },
                left: { type: 'number', description: '左边距离' },
                right: { type: 'number', description: '右边距离' },
                // progress
                progress: { type: 'number', description: '进度值 (0-1)' },
                reverse: { type: 'boolean', description: '是否反向' },
                // editbox
                placeholder: { type: 'string', description: '占位符文本' },
                maxLength: { type: 'number', description: '最大长度' },
                inputMode: { type: 'string', description: '输入模式', enum: ['ANY', 'EMAIL_ADDR', 'NUMERIC', 'PHONE_NUMBER', 'URL', 'DECIME', 'SINGLE_LINE'] },
                // slider
                sliderValue: { type: 'number', description: '滑动条值 (0-1)' },
                wholeNumbers: { type: 'boolean', description: '是否为整数' },
                // toggle
                isChecked: { type: 'boolean', description: '是否选中 (用于 toggle)' },
                checkMark: { type: 'string', description: '选中标记精灵帧路径 (用于 toggle)' }
            },
            required: ['action', 'uuid']
        };
    }

    async executeAction(action: string, args: any): Promise<ToolResponse> {
        switch (action) {
            case 'label': return await this.configureLabel(args);
            case 'sprite': return await this.configureSprite(args);
            case 'button': return await this.configureButton(args);
            case 'layout': return await this.configureLayout(args);
            case 'widget': return await this.configureWidget(args);
            case 'progress': return await this.configureProgress(args);
            case 'editbox': return await this.configureEditBox(args);
            case 'slider': return await this.configureSlider(args);
            case 'toggle': return await this.configureToggle(args);
            default: return { success: false, error: `Unknown action: ${action}` };
        }
    }

    /**
     * 批量设置组件属性，统一通过 setSceneProperty 处理 dump 格式
     * @param uuid 节点 UUID
     * @param compPath 组件路径，如 '__comps__.cc.Label'
     * @param props 属性映射: { propertyName: { value, typeHint } }
     */
    private async setProperties(uuid: string, compPath: string, props: Record<string, { value: any; typeHint?: string }>): Promise<{ updates: string[]; errors: string[] }> {
        const updates: string[] = [];
        const errors: string[] = [];
        for (const [prop, { value, typeHint }] of Object.entries(props)) {
            if (value === undefined) continue;
            const result = await this.setSceneProperty(uuid, `${compPath}.${prop}`, value, typeHint);
            if (result.success) updates.push(prop);
            else errors.push(prop);
        }
        return { updates, errors };
    }

    private async configureLabel(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid');
        if (missing) return missing;

        const { updates, errors } = await this.setProperties(args.uuid, '__comps__.cc.Label', {
            string: { value: args.text },
            fontSize: { value: args.fontSize },
            color: { value: args.fontColor, typeHint: 'color' }
        });

        if (errors.length > 0) return { success: false, error: `Failed to set: ${errors.join(', ')}` };
        if (updates.length === 0) return { success: false, error: 'No properties specified (text, fontSize, fontColor)' };
        return { success: true, message: `Label configured: ${updates.join(', ')}`, data: { uuid: args.uuid, updates } };
    }

    private async configureSprite(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid');
        if (missing) return missing;

        const updates: string[] = [];

        if (args.spriteFrame !== undefined) {
            let sfUuid = args.spriteFrame;
            if (args.spriteFrame.startsWith('db://')) {
                const uuid = await this.resolveAssetUuid(args.spriteFrame);
                if (!uuid) return { success: false, error: `SpriteFrame not found: ${args.spriteFrame}` };
                sfUuid = uuid;
            }
            const result = await this.setSceneProperty(args.uuid, '__comps__.cc.Sprite.spriteFrame', sfUuid);
            if (result.success) updates.push('spriteFrame');
        }

        if (args.sizeMode !== undefined) {
            const result = await this.setSceneProperty(args.uuid, '__comps__.cc.Sprite.sizeMode', args.sizeMode);
            if (result.success) updates.push('sizeMode');
        }

        if (updates.length === 0) return { success: false, error: 'No properties specified (spriteFrame, sizeMode)' };
        return { success: true, message: `Sprite configured: ${updates.join(', ')}`, data: { uuid: args.uuid, updates } };
    }

    private async configureButton(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid');
        if (missing) return missing;

        const { updates, errors } = await this.setProperties(args.uuid, '__comps__.cc.Button', {
            transition: { value: args.transition },
            normalColor: { value: args.normalColor, typeHint: 'color' },
            pressedColor: { value: args.pressedColor, typeHint: 'color' }
        });

        if (errors.length > 0) return { success: false, error: `Failed to set: ${errors.join(', ')}` };
        if (updates.length === 0) return { success: false, error: 'No properties specified (transition, normalColor, pressedColor)' };
        return { success: true, message: `Button configured: ${updates.join(', ')}`, data: { uuid: args.uuid, updates } };
    }

    private async configureLayout(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid');
        if (missing) return missing;

        const { updates, errors } = await this.setProperties(args.uuid, '__comps__.cc.Layout', {
            type: { value: args.layoutType },
            resizeMode: { value: args.resizeMode }
        });

        if (errors.length > 0) return { success: false, error: `Failed to set: ${errors.join(', ')}` };
        if (updates.length === 0) return { success: false, error: 'No properties specified (layoutType, resizeMode)' };
        return { success: true, message: `Layout configured: ${updates.join(', ')}`, data: { uuid: args.uuid, updates } };
    }

    private async configureWidget(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid');
        if (missing) return missing;

        const { updates, errors } = await this.setProperties(args.uuid, '__comps__.cc.Widget', {
            isAlignTop: { value: args.isAlignTop },
            isAlignBottom: { value: args.isAlignBottom },
            isAlignLeft: { value: args.isAlignLeft },
            isAlignRight: { value: args.isAlignRight },
            isAlignHCenter: { value: args.isAlignHCenter },
            isAlignVCenter: { value: args.isAlignVCenter },
            top: { value: args.top },
            bottom: { value: args.bottom },
            left: { value: args.left },
            right: { value: args.right }
        });

        if (errors.length > 0) return { success: false, error: `Failed to set: ${errors.join(', ')}` };
        if (updates.length === 0) return { success: false, error: 'No properties specified (isAlignTop/Bottom/Left/Right, top/bottom/left/right)' };
        return { success: true, message: `Widget configured: ${updates.join(', ')}`, data: { uuid: args.uuid, updates } };
    }

    private async configureProgress(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid');
        if (missing) return missing;

        const { updates, errors } = await this.setProperties(args.uuid, '__comps__.cc.ProgressBar', {
            progress: { value: args.progress },
            reverse: { value: args.reverse }
        });

        if (errors.length > 0) return { success: false, error: `Failed to set: ${errors.join(', ')}` };
        if (updates.length === 0) return { success: false, error: 'No properties specified (progress, reverse)' };
        return { success: true, message: `ProgressBar configured: ${updates.join(', ')}`, data: { uuid: args.uuid, updates } };
    }

    private async configureEditBox(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid');
        if (missing) return missing;

        const { updates, errors } = await this.setProperties(args.uuid, '__comps__.cc.EditBox', {
            placeholder: { value: args.placeholder },
            maxLength: { value: args.maxLength },
            inputMode: { value: args.inputMode }
        });

        if (errors.length > 0) return { success: false, error: `Failed to set: ${errors.join(', ')}` };
        if (updates.length === 0) return { success: false, error: 'No properties specified (placeholder, maxLength, inputMode)' };
        return { success: true, message: `EditBox configured: ${updates.join(', ')}`, data: { uuid: args.uuid, updates } };
    }

    private async configureSlider(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid');
        if (missing) return missing;

        const updates: string[] = [];

        if (args.sliderValue !== undefined) {
            const result = await this.setSceneProperty(args.uuid, '__comps__.cc.Slider.progress', args.sliderValue);
            if (result.success) updates.push('progress');
        }

        if (updates.length === 0) return { success: false, error: 'No properties specified (sliderValue)' };
        return { success: true, message: `Slider configured: ${updates.join(', ')}`, data: { uuid: args.uuid, updates } };
    }

    private async configureToggle(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid');
        if (missing) return missing;

        const updates: string[] = [];

        if (args.isChecked !== undefined) {
            const result = await this.setSceneProperty(args.uuid, '__comps__.cc.Toggle.isChecked', args.isChecked);
            if (result.success) updates.push('isChecked');
        }

        if (args.checkMark !== undefined) {
            let sfUuid = args.checkMark;
            if (args.checkMark.startsWith('db://')) {
                const uuid = await this.resolveAssetUuid(args.checkMark);
                if (!uuid) return { success: false, error: `CheckMark sprite not found: ${args.checkMark}` };
                sfUuid = uuid;
            }
            const result = await this.setSceneProperty(args.uuid, '__comps__.cc.Toggle.checkMark', sfUuid);
            if (result.success) updates.push('checkMark');
        }

        if (updates.length === 0) return { success: false, error: 'No properties specified (isChecked, checkMark)' };
        return { success: true, message: `Toggle configured: ${updates.join(', ')}`, data: { uuid: args.uuid, updates } };
    }
}
