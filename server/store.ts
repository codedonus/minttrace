import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { Investigation } from "../src/types.js";
import { initialSample } from "./fixtures.js";

export class Store {
  runs: Investigation[];
  constructor(private path = "data/investigations.json") {
    mkdirSync(dirname(path), { recursive: true });
    try {
      this.runs = JSON.parse(readFileSync(path, "utf8"));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT")
        throw new Error(
          "Cannot read saved investigations. Restore or repair data/investigations.json.",
        );
      this.runs = [initialSample()];
    }
    for (const run of this.runs)
      if (run.status === "running") {
        run.status = "stopped";
        run.error = "The server restarted. Start a new check to continue.";
        run.finishedAt = new Date().toISOString();
      }
    this.save();
  }
  save() {
    writeFileSync(`${this.path}.tmp`, JSON.stringify(this.runs, null, 2));
    renameSync(`${this.path}.tmp`, this.path);
  }
  get(id: string) {
    return this.runs.find((run) => run.id === id);
  }
  add(run: Investigation) {
    this.runs.unshift(run);
    this.save();
  }
}
