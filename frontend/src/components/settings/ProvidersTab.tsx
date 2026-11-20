/**
 * HopperSoft — Creador: Darwin Chavez
 */
import * as React from 'react';
import type { LucideIcon } from 'lucide-react';
import { AlertTriangle, BrainCircuit, Check, CheckCircle2, Eye, EyeOff, KeyRound, Loader2, Save, ServerCog, ShieldCheck, Sparkles, Trash2, WandSparkles, Wifi, XCircle, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { AI_PROVIDER_LIST } from '../../lib/ai/registry';
import { maskApiKey, type AITestResult } from '../../lib/ai/types';
import { useAppStore } from '../../store/useAppStore';
import type { AIProviderId } from '../../store/types';
import { Button } from '../ui/button';
import { Card, Input, Label, Select, Switch } from '../ui';
import { cn } from '../ui/utils';

const PROVIDER_STYLE: Record<AIProviderId, { icon: LucideIcon; color: string; description: string }> = {
  mock: { icon: WandSparkles, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300', description: 'Prueba sin clave' },
  anthropic: { icon: BrainCircuit, color: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300', description: 'Claude y razonamiento' },
  groq: { icon: Zap, color: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300', description: 'Respuestas rápidas' },
  gemini: { icon: Sparkles, color: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300', description: 'Google Gemini' },
  deepseek: { icon: BrainCircuit, color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300', description: 'Modelos DeepSeek' },
  openaiCompatible: { icon: ServerCog, color: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200', description: 'OpenAI y compatibles' },
};

function ProviderIcon({ id }: { id: AIProviderId }) {
  const { icon: Icon, color } = PROVIDER_STYLE[id];
  return <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', color)}><Icon className="h-5 w-5" aria-hidden="true" /></span>;
}

export function ProvidersTab() {
  const activeProviderId = useAppStore((s) => s.activeProviderId);
  const providers = useAppStore((s) => s.providers);
  const timeoutSeconds = useAppStore((s) => s.settings.timeoutSeconds);
  const setActiveProvider = useAppStore((s) => s.setActiveProvider);
  const updateProviderConfig = useAppStore((s) => s.updateProviderConfig);
  const clearProviderKey = useAppStore((s) => s.clearProviderKey);
  const [revealed, setRevealed] = React.useState(false);
  const [customModel, setCustomModel] = React.useState(false);
  const [testing, setTesting] = React.useState(false);
  const [testResult, setTestResult] = React.useState<AITestResult>();
  const [savedNotice, setSavedNotice] = React.useState(false);

  const provider = AI_PROVIDER_LIST.find((item) => item.id === activeProviderId)!;
  const cfg = providers[activeProviderId];
  const isMock = activeProviderId === 'mock';
  const supportsCustomModel = provider.id !== 'gemini' && provider.allowsCustomModel;
  const showCustomModel = customModel || (provider.models.length > 0 && !provider.models.includes(cfg.model));

  const selectProvider = (id: AIProviderId) => { setActiveProvider(id); setRevealed(false); setCustomModel(false); setTestResult(undefined); setSavedNotice(false); };
  const saveChanges = () => {
    // El store persiste los campos al modificarlos; este paso confirma la acción de forma explícita para la persona usuaria.
    setSavedNotice(true);
    toast.success(`Configuración de ${provider.name} guardada.`);
  };
  const handleTest = async () => {
    setTesting(true); setTestResult(undefined);
    try {
      const result = await provider.testConnection(cfg, timeoutSeconds);
      setTestResult(result);
      result.ok ? toast.success(`${provider.name}: conexión correcta`) : toast.error(`${provider.name}: ${result.message}`);
    } finally { setTesting(false); }
  };

  return <div className="space-y-5">
    <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" /><p><strong>Protege tus claves.</strong> En esta demostración se guardan en este navegador. Para producción, usa un backend seguro.</p></div>

    <Card className="overflow-hidden p-0">
      <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800"><h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Elige tu proveedor de IA</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Selecciona el servicio que responderá los mensajes de tus clientes.</p></div>
      <div className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-2 xl:grid-cols-3">
        {AI_PROVIDER_LIST.map((item) => {
          const active = item.id === activeProviderId;
          return <button key={item.id} type="button" onClick={() => selectProvider(item.id)} className={cn('group relative flex items-center gap-3 rounded-xl border p-3 text-left transition-all focus-visible:ring-2 focus-visible:ring-[var(--accent-500)] focus-visible:outline-none', active ? 'border-[var(--accent-500)] bg-[var(--accent-50)] shadow-sm dark:bg-[var(--accent-700)]/15' : 'border-slate-200 bg-white hover:border-[var(--accent-500)] hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800')}><ProviderIcon id={item.id} /><span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-slate-900 dark:text-slate-100">{item.name}</span><span className="block truncate text-xs text-slate-500 dark:text-slate-400">{PROVIDER_STYLE[item.id].description}</span></span>{active && <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent-600)] text-white"><Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" /></span>}</button>;
        })}
      </div>
    </Card>

    <Card className="p-5 sm:p-6">
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800"><div className="flex items-center gap-3"><ProviderIcon id={activeProviderId} /><div><h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Configurar {provider.name}</h2><p className="text-sm text-slate-500 dark:text-slate-400">Define credenciales y modelo para este proveedor.</p></div></div><div className="flex flex-wrap items-center gap-2"><Button variant="outline" size="sm" onClick={handleTest} disabled={testing}>{testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wifi className="h-3.5 w-3.5" />}Probar conexión</Button><Button size="sm" onClick={saveChanges}><Save className="h-3.5 w-3.5" />Guardar cambios</Button><Switch checked={cfg.enabled} disabled={isMock} onCheckedChange={(enabled) => updateProviderConfig(activeProviderId, { enabled })} label={`Activar ${provider.name}`} /></div></div>

      {(testResult || savedNotice) && <div role="status" className={cn('mt-4 flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm', testResult ? (testResult.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/35 dark:text-emerald-200' : 'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/35 dark:text-red-200') : 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950/35 dark:text-blue-200')}>{testResult ? (testResult.ok ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <XCircle className="h-4 w-4 shrink-0" />) : <CheckCircle2 className="h-4 w-4 shrink-0" />}<span>{testResult ? `${testResult.message}${testResult.ok ? ` · ${testResult.latencyMs} ms` : ''}` : 'Cambios guardados. Ya puedes probar la conexión.'}</span></div>}

      {isMock ? <div className="mt-5 flex gap-3 rounded-xl bg-[var(--accent-50)] p-4 text-sm text-[var(--accent-700)] dark:bg-[var(--accent-700)]/20 dark:text-[var(--accent-100)]"><WandSparkles className="h-5 w-5 shrink-0" aria-hidden="true" /><p>El modo demostración está listo. Simula conversaciones y reservas sin una clave de API ni conexión externa.</p></div> : <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className="lg:col-span-2"><div className="mb-1.5 flex items-center justify-between"><Label htmlFor="api-key" size="xs">Clave API</Label>{cfg.apiKey && <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400"><CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> Guardada: {maskApiKey(cfg.apiKey)}</span>}</div><div className="flex gap-2"><div className="relative flex-1"><KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" /><Input id="api-key" type={revealed ? 'text' : 'password'} value={cfg.apiKey} onChange={(event) => updateProviderConfig(activeProviderId, { apiKey: event.target.value })} placeholder={`Pega tu clave de ${provider.name} aquí`} autoComplete="off" className="h-11 pl-10 pr-11 font-mono text-xs" /><button type="button" onClick={() => setRevealed((value) => !value)} aria-label={revealed ? 'Ocultar clave' : 'Mostrar clave'} className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white">{revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div><Button variant="outline" size="icon" disabled={!cfg.apiKey} onClick={() => { clearProviderKey(activeProviderId); toast.info(`Clave de ${provider.name} borrada.`); }} aria-label="Borrar clave"><Trash2 className="h-4 w-4 text-red-600" aria-hidden="true" /></Button></div><p className="mt-2 text-xs text-slate-500 dark:text-slate-400">La clave queda oculta por seguridad. Puedes reemplazarla en cualquier momento.</p></div>
        {provider.requiresBaseUrl && <div><Label htmlFor="base-url" size="xs">URL base</Label><Input id="base-url" type="url" value={cfg.baseUrl ?? ''} onChange={(event) => updateProviderConfig(activeProviderId, { baseUrl: event.target.value })} placeholder="https://api.openai.com/v1" className="mt-1.5 font-mono text-xs" /></div>}
        <div className={cn(provider.requiresBaseUrl && 'lg:col-start-2')}><div className="flex items-center justify-between"><Label htmlFor="model" size="xs">Modelo</Label>{supportsCustomModel && <button type="button" onClick={() => setCustomModel((value) => !value)} className="text-xs font-semibold text-[var(--accent-700)] hover:underline dark:text-[var(--accent-500)]">{showCustomModel ? 'Ver sugeridos' : 'Usar otro modelo'}</button>}</div>{provider.id === 'gemini' || showCustomModel ? <Input id="model" value={cfg.model} onChange={(event) => updateProviderConfig(activeProviderId, { model: event.target.value })} placeholder={provider.models[0] ?? 'nombre-del-modelo'} className="mt-1.5 font-mono text-xs" /> : <Select id="model" value={cfg.model} onChange={(event) => updateProviderConfig(activeProviderId, { model: event.target.value })} className="mt-1.5 font-mono text-xs">{provider.models.map((model) => <option key={model} value={model}>{model}</option>)}</Select>}</div>
      </div>}

      <div className="mt-6 border-t border-slate-100 pt-5 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">Guarda la clave primero y después usa <strong>Probar conexión</strong> para verificar que el proveedor está listo.</div>
    </Card>
  </div>;
}
