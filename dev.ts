// `bun dev` starts the API (port 8787) and the website (port 5173) together.
// Press Ctrl+C once to stop both.
const run = (cwd: string) =>
  Bun.spawn(["bun", "run", "dev"], { cwd, stdout: "inherit", stderr: "inherit" });

const procs = [run("apps/api"), run("apps/web")];

const stop = () => {
  for (const p of procs) p.kill();
};
process.on("SIGINT", () => {
  stop();
  process.exit(0);
});

await Promise.race(procs.map((p) => p.exited));
stop();
