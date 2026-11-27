import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  Pagination,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  type SortDirection,
} from "./table";

function renderTable(sort?: SortDirection, onSort?: () => void) {
  render(
    <Table>
      <TableHead>
        <TableRow>
          <TableHeaderCell sort={sort} onSort={onSort}>
            Operator
          </TableHeaderCell>
          <TableHeaderCell>Status</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        <TableRow>
          <TableCell>Skyline Charters</TableCell>
          <TableCell>Approved</TableCell>
        </TableRow>
      </TableBody>
    </Table>,
  );
}

describe("Table", () => {
  it("renders a semantic table inside a scrolling wrapper", () => {
    renderTable();

    const table = screen.getByRole("table");
    expect(table.parentElement).toHaveClass("overflow-auto");
    expect(screen.getAllByRole("columnheader")).toHaveLength(2);
    expect(
      screen.getByRole("cell", { name: "Skyline Charters" }),
    ).toBeInTheDocument();
  });

  it("leaves a plain column without a sort button or aria-sort", () => {
    renderTable();

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Status" }),
    ).not.toHaveAttribute("aria-sort");
  });

  it.each<[SortDirection, string]>([
    ["asc", "ascending"],
    ["desc", "descending"],
    ["none", "none"],
  ])("announces a %s sort as aria-sort=%s", (sort, ariaSort) => {
    renderTable(sort, () => {});

    expect(
      screen.getByRole("columnheader", { name: "Operator" }),
    ).toHaveAttribute("aria-sort", ariaSort);
  });

  it("calls onSort from the heading button, by pointer and keyboard", async () => {
    const user = userEvent.setup();
    const onSort = vi.fn();
    renderTable("none", onSort);

    await user.click(screen.getByRole("button", { name: "Operator" }));
    expect(onSort).toHaveBeenCalledTimes(1);

    await user.keyboard("{Enter}");
    expect(onSort).toHaveBeenCalledTimes(2);
  });
});

describe("Pagination", () => {
  it("shows the range and disables Previous on the first page", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(
      <Pagination
        page={1}
        pageSize={20}
        total={45}
        onPageChange={onPageChange}
      />,
    );

    expect(screen.getByText("Showing 1–20 of 45")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("caps the range and disables Next on the last page", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(
      <Pagination
        page={3}
        pageSize={20}
        total={45}
        onPageChange={onPageChange}
      />,
    );

    expect(screen.getByText("Showing 41–45 of 45")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Previous" }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("disables both buttons when there is nothing to page through", () => {
    render(
      <Pagination page={1} pageSize={20} total={0} onPageChange={() => {}} />,
    );

    expect(screen.getByText("No results")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
  });
});

describe("Table overflow", () => {
  function fakeLayout(scrollWidth: number, clientWidth: number) {
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        disconnect() {}
      },
    );
    Object.defineProperty(HTMLElement.prototype, "scrollWidth", {
      configurable: true,
      get: () => scrollWidth,
    });
    Object.defineProperty(HTMLElement.prototype, "clientWidth", {
      configurable: true,
      get: () => clientWidth,
    });
  }

  afterEach(() => {
    vi.unstubAllGlobals();
    // @ts-expect-error remove the stubbed instance properties
    delete HTMLElement.prototype.scrollWidth;
    // @ts-expect-error remove the stubbed instance properties
    delete HTMLElement.prototype.clientWidth;
  });

  it("is not a focusable region while the table fits", () => {
    fakeLayout(500, 500);
    renderTable();

    const wrapper = screen.getByRole("table").parentElement!;
    expect(wrapper).not.toHaveAttribute("tabindex");
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
    expect(screen.getByTestId("table-shadow-end")).toHaveClass("opacity-0");
  });

  it("becomes a named, focusable region and shows an edge cue when wider", () => {
    fakeLayout(900, 400);
    renderTable();

    const region = screen.getByRole("region", {
      name: "Table, scrolls sideways",
    });
    expect(region).toHaveAttribute("tabindex", "0");
    expect(screen.getByTestId("table-shadow-end")).toHaveClass("opacity-100");
    expect(screen.getByTestId("table-shadow-start")).toHaveClass("opacity-0");

    act(() => {
      region.scrollLeft = 200;
      fireEvent.scroll(region);
    });
    expect(screen.getByTestId("table-shadow-start")).toHaveClass("opacity-100");
    expect(screen.getByTestId("table-shadow-end")).toHaveClass("opacity-100");

    act(() => {
      region.scrollLeft = 500;
      fireEvent.scroll(region);
    });
    expect(screen.getByTestId("table-shadow-end")).toHaveClass("opacity-0");
  });
});
