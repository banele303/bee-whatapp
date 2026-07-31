const fs = require('fs');
const file = 'src/app/(dashboard)/automations/copilot/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace dark colors with semantic variables
content = content.replace(/bg-zinc-950\/90/g, 'bg-background/90 backdrop-blur-md');
content = content.replace(/bg-zinc-950\/80/g, 'bg-background/80 backdrop-blur-md');
content = content.replace(/bg-zinc-950\/40/g, 'bg-background/40');
content = content.replace(/bg-zinc-950/g, 'bg-background');

content = content.replace(/bg-zinc-900\/95/g, 'bg-card/95 backdrop-blur-md');
content = content.replace(/bg-zinc-900\/90/g, 'bg-card/90 backdrop-blur-md');
content = content.replace(/bg-zinc-900\/80/g, 'bg-card/80');
content = content.replace(/bg-zinc-900\/60/g, 'bg-card/60');
content = content.replace(/bg-zinc-900\/40/g, 'bg-card/40');
content = content.replace(/bg-zinc-900/g, 'bg-card');

content = content.replace(/bg-zinc-800\/80/g, 'bg-muted/80');
content = content.replace(/bg-zinc-800\/60/g, 'bg-muted/60');
content = content.replace(/bg-zinc-800\/50/g, 'bg-muted/50');
content = content.replace(/bg-zinc-800/g, 'bg-muted');

content = content.replace(/border-zinc-800\/80/g, 'border-border/80');
content = content.replace(/border-zinc-800\/60/g, 'border-border/60');
content = content.replace(/border-zinc-800/g, 'border-border');

content = content.replace(/text-zinc-100/g, 'text-foreground');
content = content.replace(/text-zinc-200/g, 'text-foreground/90');
content = content.replace(/text-zinc-300/g, 'text-muted-foreground');
content = content.replace(/text-zinc-400/g, 'text-muted-foreground/80');
content = content.replace(/text-zinc-500/g, 'text-muted-foreground/60');

// Fix the hardcoded light/dark combinations to just use semantic variables
content = content.replace(/bg-slate-50 dark:bg-slate-950/g, 'bg-background');
content = content.replace(/bg-white dark:bg-slate-900/g, 'bg-card');
content = content.replace(/border-slate-200 dark:border-slate-800/g, 'border-border');
content = content.replace(/text-slate-900 dark:text-slate-100/g, 'text-foreground');
content = content.replace(/text-slate-900 dark:text-white/g, 'text-foreground');
content = content.replace(/text-slate-500 dark:text-slate-400/g, 'text-muted-foreground');
content = content.replace(/text-slate-700 dark:text-slate-300/g, 'text-foreground/80');
content = content.replace(/bg-slate-100 dark:bg-slate-800/g, 'bg-muted');
content = content.replace(/border-slate-300 dark:border-slate-700/g, 'border-border');
content = content.replace(/hover:text-slate-900 dark:hover:text-slate-200/g, 'hover:text-foreground');
content = content.replace(/bg-white dark:bg-slate-800/g, 'bg-card');
content = content.replace(/hover:bg-slate-100 dark:hover:bg-slate-700/g, 'hover:bg-muted');

// Fix the native browser scrollbars issue
content = content.replace(/<ScrollArea className="flex-1 p-4 md:p-6 overflow-y-auto">/g, '<ScrollArea className="flex-1 p-4 md:p-6">');
content = content.replace(/overflow-y-auto/g, 'overflow-y-hidden');

fs.writeFileSync(file, content);
console.log('Replacements completed successfully');
