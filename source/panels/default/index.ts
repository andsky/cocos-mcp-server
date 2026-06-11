import { readFileSync } from 'fs-extra';
import { join } from 'path';
import { createApp, App, defineComponent, ref, computed, onMounted, watch } from 'vue';

const panelDataMap = new WeakMap<any, App>();
let statusTimer: ReturnType<typeof setInterval> | null = null;

interface ServerSettings {
    port: number;
    autoStart: boolean;
    debugLog: boolean;
    maxConnections: number;
}

module.exports = Editor.Panel.define({
    listeners: {
        show() { console.log('[MCP Panel] shown'); },
        hide() { console.log('[MCP Panel] hidden'); },
    },
    template: readFileSync(join(__dirname, '../../../static/template/default/index.html'), 'utf-8'),
    style: readFileSync(join(__dirname, '../../../static/style/default/index.css'), 'utf-8'),
    $: { app: '#app', panelTitle: '#panelTitle' },
    ready() {
        if (!this.$.app) return;
        const app = createApp({});
        app.config.compilerOptions.isCustomElement = (tag) => tag.startsWith('ui-');

        app.component('McpServerApp', defineComponent({
            setup() {
                const serverRunning = ref(false);
                const serverStatus = ref('已停止');
                const connectedClients = ref(0);
                const httpUrl = ref('');
                const isProcessing = ref(false);
                const settingsChanged = ref(false);

                const settings = ref<ServerSettings>({
                    port: 3000, autoStart: false, debugLog: false, maxConnections: 10,
                });

                const statusClass = computed(() => ({
                    'status-running': serverRunning.value,
                    'status-stopped': !serverRunning.value,
                }));

                const toggleServer = async () => {
                    try {
                        isProcessing.value = true;
                        if (serverRunning.value) {
                            await Editor.Message.request('cocos-mcp-server', 'stop-server');
                        } else {
                            await Editor.Message.request('cocos-mcp-server', 'update-settings', {
                                port: settings.value.port,
                                autoStart: settings.value.autoStart,
                                enableDebugLog: settings.value.debugLog,
                                maxConnections: settings.value.maxConnections,
                            });
                            await Editor.Message.request('cocos-mcp-server', 'start-server');
                        }
                    } catch (e) {
                        console.error('[MCP Panel] toggle failed:', e);
                    } finally {
                        isProcessing.value = false;
                    }
                };

                const saveSettings = async () => {
                    try {
                        await Editor.Message.request('cocos-mcp-server', 'update-settings', {
                            port: settings.value.port,
                            autoStart: settings.value.autoStart,
                            enableDebugLog: settings.value.debugLog,
                            maxConnections: settings.value.maxConnections,
                        });
                        settingsChanged.value = false;
                    } catch (e) {
                        console.error('[MCP Panel] save failed:', e);
                    }
                };

                const copyUrl = async () => {
                    try { await navigator.clipboard.writeText(httpUrl.value); } catch { /* ignore */ }
                };

                const refreshStatus = async () => {
                    try {
                        const r = await Editor.Message.request('cocos-mcp-server', 'get-server-status');
                        if (!r) return;
                        serverRunning.value = r.running;
                        serverStatus.value = r.running ? '运行中' : '已停止';
                        connectedClients.value = r.clients || 0;
                        httpUrl.value = r.running ? `http://localhost:${r.port}` : '';
                    } catch { /* ignore */ }
                };

                watch(settings, () => { settingsChanged.value = true; }, { deep: true });

                onMounted(async () => {
                    try {
                        const r = await Editor.Message.request('cocos-mcp-server', 'get-server-status');
                        if (r?.settings) {
                            settings.value = {
                                port: r.settings.port || 3000,
                                autoStart: r.settings.autoStart || false,
                                debugLog: r.settings.enableDebugLog || false,
                                maxConnections: r.settings.maxConnections || 10,
                            };
                        }
                    } catch { /* use defaults */ }

                    await refreshStatus();
                    statusTimer = setInterval(refreshStatus, 2000);
                });

                return {
                    serverRunning, serverStatus, connectedClients, httpUrl,
                    isProcessing, settings, settingsChanged, statusClass,
                    toggleServer, saveSettings, copyUrl,
                };
            },
            template: readFileSync(join(__dirname, '../../../static/template/vue/mcp-server-app.html'), 'utf-8'),
        }));

        app.mount(this.$.app);
        panelDataMap.set(this, app);
    },
    beforeClose() {},
    close() {
        if (statusTimer) { clearInterval(statusTimer); statusTimer = null; }
        const app = panelDataMap.get(this);
        if (app) app.unmount();
    },
});
