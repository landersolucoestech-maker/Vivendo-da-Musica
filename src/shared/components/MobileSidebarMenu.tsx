import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/shared/components/ui/sheet";
import SidebarNavList, { type SidebarNavItem } from "@/shared/components/SidebarNavList";

interface MobileSidebarMenuProps {
  sectionLabel: string;
  items: SidebarNavItem[];
  exactPath?: string;
}

const MobileSidebarMenu = ({ sectionLabel, items, exactPath }: MobileSidebarMenuProps) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden border-b border-border bg-background px-4 py-2 sticky top-16 z-30">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" className="border-border">
            <Menu className="w-4 h-4 mr-2" />
            Menu
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 overflow-y-auto">
          <p className="text-xs font-semibold text-muted-foreground uppercase px-1 mb-3 mt-2">{sectionLabel}</p>
          <SidebarNavList items={items} exactPath={exactPath} onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default MobileSidebarMenu;
