"use strict";
document.addEventListener("DOMContentLoaded", async () => {
  const total = document.querySelector("#total-hits");
  const body = document.querySelector("#stats-body");
  const status = document.querySelector("#stats-status");
  try {
    const response = await fetch("/api/hits", { cache: "no-store" });
    if (!response.ok) throw new Error(`Request failed with ${response.status}`);
    const data = await response.json();
    total.textContent = Number(data.total || 0).toLocaleString();
    body.replaceChildren(...data.pages.map((page) => {
      const row = document.createElement("tr");
      const pathCell = document.createElement("td");
      const hitCell = document.createElement("td");
      const dateCell = document.createElement("td");
      pathCell.textContent = page.path;
      hitCell.textContent = Number(page.hits || 0).toLocaleString();
      dateCell.textContent = page.updatedAt ? new Date(page.updatedAt).toLocaleString() : "—";
      row.append(pathCell, hitCell, dateCell);
      return row;
    }));
    status.textContent = data.pages.length ? `${data.pages.length} page${data.pages.length === 1 ? "" : "s"} recorded` : "No page views recorded yet";
  } catch {
    total.textContent = "Unavailable";
    status.textContent = "The counter is temporarily unavailable.";
    status.classList.add("error");
  }
});
