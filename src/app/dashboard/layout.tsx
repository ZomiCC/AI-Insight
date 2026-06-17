import Link from "next/link"
import { auth } from "@/lib/auth"
import { signOutUser } from "@/lib/actions"
import { buttonVariants } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LayoutDashboard, Heart, Settings, LogOut, Brain, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  const navLinkClass = cn(
    buttonVariants({ variant: "ghost" }),
    "w-full justify-start"
  )

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="hidden w-60 border-r bg-card md:flex md:flex-col">
        <div className="flex h-16 items-center gap-2 border-b px-5">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 font-bold text-lg"
          >
            <Brain className="h-5 w-5 text-primary" />
            AI Insight
          </Link>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <Link href="/dashboard" className={navLinkClass}>
            <LayoutDashboard className="mr-2 h-4 w-4" />
            项目列表
          </Link>
          <Link href="/dashboard?tab=favorites" className={navLinkClass}>
            <Heart className="mr-2 h-4 w-4" />
            我的收藏
          </Link>
          <Link href="/dashboard/settings" className={navLinkClass}>
            <Settings className="mr-2 h-4 w-4" />
            设置
          </Link>
        </nav>
        <div className="border-t p-4">
          <DropdownMenu>
            <DropdownMenuTrigger>
              <div className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted cursor-pointer">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={session?.user?.image ?? ""} />
                  <AvatarFallback>
                    {session?.user?.name?.charAt(0) ?? "U"}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm truncate">
                  {session?.user?.name ?? "用户"}
                </span>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span>{session?.user?.name}</span>
                  <span className="text-xs text-muted-foreground font-normal">
                    {session?.user?.email}
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <form action={signOutUser} className="w-full">
                  <button
                    type="submit"
                    className="flex w-full items-center"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    退出登录
                  </button>
                </form>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b px-4 md:px-6">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 font-bold text-lg md:hidden"
          >
            <Brain className="h-5 w-5 text-primary" />
            AI Insight
          </Link>
          <div className="flex items-center gap-3 md:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger>
                <Avatar className="h-7 w-7 cursor-pointer">
                  <AvatarImage src={session?.user?.image ?? ""} />
                  <AvatarFallback>
                    {session?.user?.name?.charAt(0) ?? "U"}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{session?.user?.name}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Link
                    href="/dashboard"
                    className="flex items-center w-full"
                  >
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    项目列表
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link
                    href="/dashboard?tab=favorites"
                    className="flex items-center w-full"
                  >
                    <Heart className="mr-2 h-4 w-4" />
                    我的收藏
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link
                    href="/dashboard/settings"
                    className="flex items-center w-full"
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    设置
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <form action={signOutUser} className="w-full">
                    <button
                      type="submit"
                      className="flex w-full items-center"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      退出登录
                    </button>
                  </form>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="hidden md:flex items-center gap-2 ml-auto">
            <Sparkles className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              欢迎，{session?.user?.name ?? "用户"}
            </span>
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  )
}
