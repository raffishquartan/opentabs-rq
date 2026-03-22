/**
 * DOM analysis module for the site analyzer.
 *
 * Pure analysis function: takes pre-collected DOM data from page scripts
 * and returns structured information about forms, interactive elements,
 * and data attributes. Does not call browser tools directly — the
 * orchestrator collects data and passes it here.
 */

// ---------------------------------------------------------------------------
// Input types — match data shapes the orchestrator collects via page scripts
// ---------------------------------------------------------------------------

/** A form field collected from a <form> element. */
interface FormField {
  name: string;
  type: string;
}

/** A form collected from the page via querySelectorAll('form'). */
interface FormInput {
  action: string;
  method: string;
  fields: FormField[];
}

/** An interactive element collected from the page. */
interface InteractiveElementInput {
  tag: string;
  type: string | undefined;
  name: string | undefined;
  id: string | undefined;
  text: string | undefined;
}

/** Data collected by the orchestrator and passed to detectDom. */
interface DomDetectionInput {
  forms: FormInput[];
  interactiveElements: InteractiveElementInput[];
  dataAttributes: string[];
}

// ---------------------------------------------------------------------------
// Output types
// ---------------------------------------------------------------------------

/** An analyzed form element with its action URL, HTTP method, and fields. */
interface FormAnalysis {
  action: string;
  method: string;
  fields: FormField[];
}

/** An interactive DOM element (button, input, link, etc.) with identifying attributes. */
interface InteractiveElement {
  tag: string;
  type: string | undefined;
  name: string | undefined;
  id: string | undefined;
  text: string | undefined;
}

/** Result of DOM analysis: forms, interactive elements, and data-attribute patterns found on the page. */
interface DomAnalysis {
  forms: FormAnalysis[];
  interactiveElements: InteractiveElement[];
  dataAttributes: string[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum number of interactive elements to include in the output. */
const MAX_INTERACTIVE_ELEMENTS = 50;

// ---------------------------------------------------------------------------
// Detection logic
// ---------------------------------------------------------------------------

/**
 * Analyze collected DOM data and return structured results.
 *
 * This is a pure function: takes data in, returns structured results.
 * The heavy lifting (querying the DOM for forms, interactive elements,
 * and data attributes) happens in page scripts run by the orchestrator.
 * This module shapes and limits the results.
 */
const detectDom = (input: DomDetectionInput): DomAnalysis => {
  const forms: FormAnalysis[] = input.forms.map(form => ({
    action: form.action,
    method: form.method,
    fields: form.fields,
  }));

  const interactiveElements: InteractiveElement[] = input.interactiveElements
    .slice(0, MAX_INTERACTIVE_ELEMENTS)
    .map(el => ({
      tag: el.tag,
      type: el.type,
      name: el.name,
      id: el.id,
      text: el.text,
    }));

  // Deduplicate and sort data attribute names
  const dataAttributes = [...new Set(input.dataAttributes)].sort();

  return { forms, interactiveElements, dataAttributes };
};

export type {
  DomAnalysis,
  DomDetectionInput,
  FormAnalysis,
  FormField,
  FormInput,
  InteractiveElement,
  InteractiveElementInput,
};
export { detectDom };
