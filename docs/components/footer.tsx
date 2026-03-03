'use client';

import { Text } from '@/components/retroui/Text';

const quickLinks = [
  { name: 'Docs', href: '/docs' },
  { name: 'GitHub', href: 'https://github.com/AnomalyCo/opentabs' },
  { name: 'Installation', href: '/docs/install' },
];

const Footer = () => (
  <footer className="mt-24 border-t-2">
    <div className="mx-auto max-w-6xl px-4 py-16">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
        <div className="max-w-md lg:col-span-2">
          <Text as="h2" className="mb-6">
            OpenTabs
          </Text>
          <Text className="text-muted-foreground text-sm leading-relaxed">
            AI agents for any web app. Give AI agents access to any web application through your authenticated browser
            session.
          </Text>
        </div>

        <div className="lg:col-span-1">
          <Text as="h4" className="mb-6">
            Quick Links
          </Text>
          <ul className="space-y-2">
            {quickLinks.map(link => (
              <li key={link.name}>
                <a
                  href={link.href}
                  className="font-medium decoration-2 decoration-primary underline-offset-4 transition-all hover:underline">
                  {link.name}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>

    <div className="bg-foreground">
      <div className="mx-auto max-w-6xl px-4 py-6 text-center">
        <Text className="text-background text-sm">
          &copy; {new Date().getFullYear()} OpenTabs. Open source under MIT license.
        </Text>
      </div>
    </div>
  </footer>
);

export default Footer;
