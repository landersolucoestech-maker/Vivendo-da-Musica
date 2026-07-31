import { useState } from 'react';
import { Menu } from 'lucide-react';

import SidebarNavList, { type SidebarNavItem } from '@/shared/components/SidebarNavList';
import { Button } from '@/shared/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/shared/components/ui/sheet';

interface MobileSidebarMenuProps {
  sectionLabel: string;
  items: SidebarNavItem[];
  exactPath?: string;
}

const MobileSidebarMenu = ({ sectionLabel, items, exactPath }: MobileSidebarMenuProps) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="sticky top-16 z-30 border-b border-white/10 bg-[#0D0D0D]/96 px-4 py-2.5 backdrop-blur-xl md:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" className="w-full justify-between sm:w-auto">
            <span className="flex items-center gap-2">
              <Menu className="size-4" />
              Navegação
            </span>
            <span className="text-xs text-muted-foreground">{sectionLabel}</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[86vw] max-w-80 overflow-y-auto border-white/10 bg-[#0A0A0A] p-4">
          <div className="mb-5 border-b border-white/10 px-1 pb-4 pt-2">
            <p className="vdm-eyebrow">Vivendo da Música</p>
            <p className="mt-1 font-display text-base font-semibold text-white">{sectionLabel}</p>
          </div>
          <SidebarNavList items={items} exactPath={exactPath} onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default MobileSidebarMenu;
