"""Genera, a partir de una sola fuente, los archivos que necesita cada herramienta.

Fuente (lo único que se edita a mano):
  .agents/skills/<skill>/SKILL.md   skills (formato abierto Agent Skills; Codex y Gemini CLI las leen aquí)
  .claude/agents/<agente>.md        agentes (Markdown con name y description)

Genera:
  .claude/skills/          copia de las skills para Claude Code
  .gemini/agents/*.md      agentes para Gemini CLI (mismo formato Markdown)
  .codex/agents/*.toml     agentes para Codex (name, description, developer_instructions)
  .gemini/commands/agendabot/*.toml   comandos /agendabot:… de Gemini CLI
  prompts/*.md             textos para chats que no leen archivos (Grok, ChatGPT, Gemini web…)

Uso (desde la raíz del kit):  python herramientas/sincronizar.py
"""
import json
import os
import re
import shutil

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
SKILLS = '.agents/skills'
AGENTS = '.claude/agents'


def frontmatter(path):
    text = open(path, encoding='utf-8').read()
    m = re.match(r'---\n(.*?)\n---\n(.*)\Z', text, re.S)
    if not m:
        raise SystemExit(f'{path}: falta la cabecera --- name / description ---')
    meta = {}
    for line in m.group(1).splitlines():
        key, _, value = line.partition(':')
        value = value.strip()
        meta[key.strip()] = json.loads(value) if value.startswith('"') else value
    return meta, m.group(2).strip()


def write(path, text):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8', newline='\n') as f:
        f.write(text)


def toml_str(s):
    # Cadena básica TOML; json.dumps produce escapes compatibles (\" \\ \n \uXXXX).
    return json.dumps(s, ensure_ascii=False)


skills = sorted(os.listdir(SKILLS))
agents = {n[:-3]: frontmatter(os.path.join(AGENTS, n)) for n in sorted(os.listdir(AGENTS)) if n.endswith('.md')}
for s in skills:
    frontmatter(os.path.join(SKILLS, s, 'SKILL.md'))  # valida

# 1. Claude Code: copia de las skills
shutil.rmtree('.claude/skills', ignore_errors=True)
shutil.copytree(SKILLS, '.claude/skills')

# 2. Gemini CLI: agentes en Markdown
shutil.rmtree('.gemini/agents', ignore_errors=True)
for name in agents:
    write(f'.gemini/agents/{name}.md', open(os.path.join(AGENTS, name + '.md'), encoding='utf-8').read())

# 3. Codex: agentes en TOML
shutil.rmtree('.codex/agents', ignore_errors=True)
for name, (meta, body) in agents.items():
    if "'''" in body:
        raise SystemExit(f'{name}: el cuerpo no puede contener tres comillas simples seguidas')
    write(f'.codex/agents/{name}.toml',
          f"name = {toml_str(meta['name'])}\n"
          f"description = {toml_str(meta['description'])}\n"
          f"developer_instructions = '''\n{body}\n'''\n")

# 4. Gemini CLI: comandos /agendabot:…
S = lambda n: f'{SKILLS}/{n}/SKILL.md'
A = lambda n: f'.gemini/agents/{n}.md'
COMMANDS = {
    'construir': ('Explica el kit de AgendaBot y propone el plan de construcción paso a paso',
                  [S('agendabot-construir')],
                  'Lee la skill de abajo. Explícame en pocas líneas qué vamos a construir y en qué orden, y empieza por el paso que yo indique (o por la base de datos si no digo nada).'),
    'base-de-datos': ('Construye desde cero la base de datos de AgendaBot',
                      [S('agendabot-construir'), A('agendabot-base-de-datos'), S('agendabot-base-de-datos')],
                      'Actúa como el agente de base de datos de abajo y construye su parte siguiendo las skills.'),
    'backend': ('Construye desde cero el backend de AgendaBot (API, IA y WhatsApp)',
                [S('agendabot-construir'), A('agendabot-backend'), S('agendabot-contrato-api'), S('agendabot-backend'), S('agendabot-modelos-ia'), S('agendabot-asistente-whatsapp')],
                'Actúa como el agente de backend de abajo y construye su parte siguiendo las skills.'),
    'frontend': ('Construye desde cero el frontend de AgendaBot',
                 [S('agendabot-construir'), A('agendabot-frontend'), S('agendabot-contrato-api'), S('agendabot-frontend'), S('agendabot-modelos-ia'), S('agendabot-pantallas-cuenta'), S('agendabot-imagenes')],
                 'Actúa como el agente de frontend de abajo y construye su parte siguiendo las skills.'),
    'verificar': ('Revisa la construcción de AgendaBot contra todos los criterios de aceptación',
                  [S('agendabot-construir'), A('agendabot-revisor'), S('agendabot-verificar')],
                  'Actúa como el revisor de abajo y entrega el informe.'),
}
shutil.rmtree('.gemini/commands/agendabot', ignore_errors=True)
for cmd, (desc, files, task) in COMMANDS.items():
    includes = '\n\n'.join(f'@{{{f}}}' for f in files)
    write(f'.gemini/commands/agendabot/{cmd}.toml',
          f'description = {toml_str(desc)}\nprompt = """\n{task}\n\nInstrucciones adicionales del usuario: {{{{args}}}}\n\n{includes}\n"""\n')

# 5. Prompts para chats sin acceso a archivos
PROMPTS = {
    '1-base-de-datos.md': ('Base de datos', ['agendabot-construir', 'agendabot-base-de-datos'], 'agendabot-base-de-datos'),
    '2-backend.md': ('Backend', ['agendabot-construir', 'agendabot-contrato-api', 'agendabot-backend', 'agendabot-modelos-ia', 'agendabot-asistente-whatsapp'], 'agendabot-backend'),
    '3-frontend.md': ('Frontend', ['agendabot-construir', 'agendabot-contrato-api', 'agendabot-frontend', 'agendabot-modelos-ia', 'agendabot-pantallas-cuenta', 'agendabot-imagenes'], 'agendabot-frontend'),
    '4-revision.md': ('Revisión', ['agendabot-construir', 'agendabot-verificar'], 'agendabot-revisor'),
}
shutil.rmtree('prompts', ignore_errors=True)
for fn, (title, sks, agent) in PROMPTS.items():
    attach = '\n'.join(f'- `{S(s)}`' for s in sks) + f'\n- `{AGENTS}/{agent}.md`'
    write(f'prompts/{fn}', f'''# Prompt · {title}

> Para agentes o chats que **no leen archivos del proyecto** (Grok, ChatGPT, Gemini web…). Adjunta estos archivos del kit y después pega el texto de debajo de la línea:
{attach}

---

Te adjunto las skills (especificaciones) y el rol de un proyecto llamado AgendaBot. No hay código de referencia: construyes desde cero siguiendo las skills al pie de la letra.

{agents[agent][1]}
''')

print(f'ok: {len(skills)} skills, {len(agents)} agentes para Claude Code, Codex, Gemini CLI y prompts')
