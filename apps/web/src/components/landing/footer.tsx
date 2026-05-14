import Link from 'next/link';
import { Dumbbell, Instagram, Twitter, Youtube, Linkedin } from 'lucide-react';

const links = {
  Produto: [
    { label: 'Funcionalidades', href: '#features' },
    { label: 'Preços', href: '#pricing' },
    { label: 'Changelog', href: '/changelog' },
    { label: 'Roadmap', href: '/roadmap' },
    { label: 'API Docs', href: '/docs' },
  ],
  Empresa: [
    { label: 'Sobre nós', href: '/about' },
    { label: 'Blog', href: '/blog' },
    { label: 'Carreiras', href: '/careers' },
    { label: 'Imprensa', href: '/press' },
    { label: 'Contato', href: '/contact' },
  ],
  Suporte: [
    { label: 'Central de ajuda', href: '/help' },
    { label: 'Documentação', href: '/docs' },
    { label: 'Status', href: '/status' },
    { label: 'Comunidade', href: '/community' },
    { label: 'Webinars', href: '/webinars' },
  ],
  Legal: [
    { label: 'Privacidade', href: '/privacy' },
    { label: 'Termos de uso', href: '/terms' },
    { label: 'LGPD', href: '/lgpd' },
    { label: 'Cookies', href: '/cookies' },
    { label: 'SLA', href: '/sla' },
  ],
};

const socials = [
  { icon: Instagram, href: '#', label: 'Instagram' },
  { icon: Twitter, href: '#', label: 'Twitter' },
  { icon: Youtube, href: '#', label: 'YouTube' },
  { icon: Linkedin, href: '#', label: 'LinkedIn' },
];

export function LandingFooter() {
  return (
    <footer className="border-t border-border/50 bg-background">
      <div className="container mx-auto px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2 font-bold text-xl mb-4">
              <div className="w-8 h-8 bg-gradient-brand rounded-lg flex items-center justify-center">
                <Dumbbell className="w-4 h-4 text-white" />
              </div>
              <span className="gradient-text">FitSaaS</span>
            </Link>
            <p className="text-sm text-muted-foreground max-w-xs leading-relaxed mb-6">
              A plataforma SaaS mais completa para personal trainers, nutricionistas e academias do Brasil.
            </p>
            {/* Social links */}
            <div className="flex items-center gap-3">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  aria-label={s.label}
                  className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
                >
                  <s.icon className="w-4 h-4 text-muted-foreground" />
                </a>
              ))}
            </div>
          </div>

          {Object.entries(links).map(([category, items]) => (
            <div key={category}>
              <h4 className="font-semibold text-sm mb-4">{category}</h4>
              <ul className="space-y-2.5">
                {items.map((item) => (
                  <li key={item.label}>
                    <Link href={item.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="border-t border-border/50 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} FitSaaS. Todos os direitos reservados.
          </p>
          <div className="flex items-center gap-4">
            <p className="text-sm text-muted-foreground">
              Feito com ❤️ no Brasil 🇧🇷
            </p>
            <div className="flex items-center gap-1.5 text-xs text-emerald-400">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Todos os sistemas operacionais
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
