import { useEffect, useState } from 'react';
import { Button } from './components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './components/ui/dialog';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { CircleArrowRight, CircleStop, Loader2, Plus, SquareStack, SquareTerminal, TerminalIcon } from 'lucide-react';
import { Toaster } from "@/components/ui/sonner"
import './App.css';
import axios from 'axios';
import { isAxiosError } from 'axios';
import { API_BASE_URL, WORKSPACES_PATH, WS_BASE_URL } from './lib/config';
import { toast } from 'sonner';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import TerminalView from './components/terminal';

function App() {
  const [isOpen, setIsOpen] = useState(false);
  const [projectPath, setProjectPath] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [workspaces, setWorkspaces] = useState<string[]>([]);
  const [newWorkspaceName, setNewWorkspaceName] = useState<string>("");
  const [popoverOpen, setPopoverOpen] = useState<boolean>(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>("");
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isRunning, setIsRunning] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (projectPath.trim() === "")
      setIsOpen(true);
  }, [projectPath]);

  useEffect(() => {
    const ws = new WebSocket(WS_BASE_URL);
    setSocket(ws);
    return () => ws.close();
  }, []);

  useEffect(() => {
    if (selectedWorkspace.trim() !== "" && socket && isRunning[selectedWorkspace])
      socket.send(JSON.stringify({ action: "RESUME", workspaceName: selectedWorkspace }));
  }, [selectedWorkspace, socket, isRunning]);

  async function fetchWorkspaces() {
    try {
      const response = await axios.get(`${API_BASE_URL}/workspaces`);
      setWorkspaces(response.data.workspaces);
    } catch (error) {
      if (isAxiosError(error))
        toast.error(error.response?.data.message || "Something went wrong");
      else
        toast.error("Something went wrong");
    }
  }

  const handleSelectProject = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/select-project`, { projectPath });
      toast.success(response.data.message);
      setIsOpen(false);
    } catch (error) {
      if (isAxiosError(error))
        toast.error(error.response?.data.message || "Something went wrong");
      else
        toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
    await fetchWorkspaces();
  };

  const handleCreateWorkspace = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/workspaces`, { workspaceName: newWorkspaceName });
      toast.success(response.data.message);
      setPopoverOpen(false);
      setNewWorkspaceName("");
    } catch (error) {
      if (isAxiosError(error))
        toast.error(error.response?.data.message || "Something went wrong");
      else
        toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
    await fetchWorkspaces();
  };

  const handleTerminalConnection = () => {
    if (!socket) return;
    socket.send(JSON.stringify({ action: "START", workspaceName: selectedWorkspace, command: `pnpm start ${WORKSPACES_PATH}/${projectPath.split("/")[projectPath.split("/").length - 1]}/${selectedWorkspace}` }));
    setIsRunning(prev => ({ ...prev, [selectedWorkspace]: true }));
  };

  const handleTerminalDisconnect = () => {
    if (!socket) return;
    socket.send(JSON.stringify({ action: "STOP", workspaceName: selectedWorkspace }));
    setIsRunning(prev => ({ ...prev, [selectedWorkspace]: false }));
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="flex justify-between items-center py-3 px-5 border-b bg-accent">
        <div className="flex items-center gap-x-2">
          <SquareTerminal className="h-6 w-6" />
          <h1 className="text-xl font-semibold">Conductor Clone</h1>
        </div>
        <div className="flex items-center gap-x-3">
          {projectPath.trim() !== "" && (
            <div className="text-sm bg-background text-muted-foreground py-1 px-2 border rounded-md">
              {projectPath.trim().split("/")[projectPath.trim().split("/").length - 1]}
            </div>
          )}
          <Button
            onClick={() => setIsOpen(true)}
            variant={"outline"}
          >
            Change Project
          </Button>
        </div>
      </nav>

      <div className="flex h-[calc(100vh-57px)]">
        <div className="w-64 border-r overflow-y-auto bg-muted">
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-semibold">Workspaces</h2>
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
              <PopoverTrigger asChild>
                <Button size={"icon-sm"}>
                  <Plus />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <h4 className="leading-none font-medium">New Workspace</h4>
                    <p className="text-muted-foreground text-sm">
                      Create a new workspace.
                    </p>
                  </div>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="workspaceName">Workspace Name</Label>
                      <Input
                        id="workspaceName"
                        value={newWorkspaceName}
                        onChange={(e) => setNewWorkspaceName(e.target.value)}
                      />
                    </div>
                    <div className="flex justify-end">
                      <Button
                        onClick={handleCreateWorkspace}
                        disabled={loading}
                      >
                        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                        Create
                      </Button>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2 p-4 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : workspaces.length > 0 ? (
              workspaces.map((workspace, index) => (
                <div
                  key={index}
                  className="py-2 px-3 rounded-lg bg-background hover:bg-accent hover:border-muted-foreground cursor-pointer transition-colors border flex items-center justify-between gap-x-3"
                  onClick={() => setSelectedWorkspace(workspace)}
                >
                  <div className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                    {workspace}
                  </div>
                  <div className={`h-3 w-3 rounded-full ${isRunning[workspace] ? "bg-green-400" : "bg-gray-300"}`}></div>
                </div>
              ))
            ) : (
              <div className="flex items-center justify-center p-4 text-sm text-muted-foreground">No workspaces available</div>
            )}
          </div>
        </div>

        {selectedWorkspace === "" ? <div className="flex-1 overflow-y-auto flex items-center justify-center">
          <div className="p-4 text-muted-foreground space-y-3">
            <div className="flex items-center justify-center">
              <SquareStack className="h-16 w-16" />
            </div>
            <div className="text-xl">Please select a workspace</div>
          </div>
        </div> : <div className="flex-1 overflow-y-auto">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-x-2">
              <div className="font-semibold">Workspace Name</div>
              <div className="text-sm bg-muted text-muted-foreground font-semibold py-1 px-2 border border-muted-foreground rounded-md">
                {selectedWorkspace}
              </div>
            </div>
            {(isRunning[selectedWorkspace]) ?
              <Button onClick={handleTerminalDisconnect}>
                <CircleStop />
                Stop
              </Button> :
              <Button onClick={handleTerminalConnection}>
                <CircleArrowRight />
                Start
              </Button>}
          </div>
          <div className="p-4 h-4/5">
            {isRunning[selectedWorkspace] ? <TerminalView workspaceName={selectedWorkspace} socket={socket} /> :
              <div className="flex items-center justify-center p-4 h-full bg-accent rounded-lg border">
                <TerminalIcon className="h-16 w-16 text-muted-foreground" />
              </div>}
          </div>
        </div>}
      </div>


      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enter Project Folder</DialogTitle>
            <DialogDescription>
              Enter the root folder of your project to get started.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="project-path-input">
              Project Path
            </Label>
            <Input
              id="project-path-input"
              type="text"
              value={projectPath}
              onChange={(e) => setProjectPath(e.target.value)}
              placeholder="Enter the full path to your project"
            />
          </div>
          <DialogFooter>
            <Button
              onClick={handleSelectProject}
              disabled={loading}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Toaster theme="light" richColors />
    </div>
  );
}

export default App;
