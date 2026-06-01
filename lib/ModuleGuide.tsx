/**
 * Reusable card layout for the guide-only side-nav modules
 * (Projects, Tasks, Reports). Renders a "How to build this module"
 * marketing/spec page so clients can see what adding the module
 * would look like in the nav, even though it isn't wired up.
 */

import type { ReactNode } from "react";

export interface ModuleGuideProps {
  moduleName: string;
  tagline: string;
  whyItFits: string;
  suggestedEntities: Array<{ name: string; fields: string }>;
  suggestedScreens: string[];
}

export function ModuleGuide({
  moduleName,
  tagline,
  whyItFits,
  suggestedEntities,
  suggestedScreens,
}: ModuleGuideProps): ReactNode {
  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-header-title">{moduleName}</h1>
          <p className="page-header-subtitle">{tagline}</p>
        </div>
        <div className="page-header-actions">
          <span className="pill is-violet">Guide</span>
        </div>
      </div>

      <div className="section-card mb-4">
        <div className="section-card-header">
          <h3 className="section-card-title">Why this module fits</h3>
        </div>
        <p style={{ color: "var(--fg-2)", lineHeight: 1.65, margin: 0 }}>{whyItFits}</p>
      </div>

      <div className="section-card mb-4">
        <div className="section-card-header">
          <h3 className="section-card-title">Suggested data model</h3>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Entity</th>
              <th>Fields</th>
            </tr>
          </thead>
          <tbody>
            {suggestedEntities.map((e) => (
              <tr key={e.name}>
                <td className="data-table-strong">{e.name}</td>
                <td style={{ color: "var(--muted)" }}>{e.fields}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="section-card mb-4">
        <div className="section-card-header">
          <h3 className="section-card-title">Suggested screens</h3>
        </div>
        <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.85 }}>
          {suggestedScreens.map((s) => (
            <li key={s} style={{ color: "var(--fg-2)" }}>{s}</li>
          ))}
        </ul>
      </div>

      <div className="section-card">
        <div className="section-card-header">
          <h3 className="section-card-title">Add this module to your portal</h3>
        </div>
        <p style={{ color: "var(--muted)", margin: "0 0 16px" }}>
          The {moduleName} module is not yet wired up in this build. Commission a
          custom sovereign module — own its data, its UI, and its lifecycle.
        </p>
        <button type="button" className="btn btn-primary" disabled>
          Request {moduleName} module
        </button>
      </div>
    </>
  );
}
