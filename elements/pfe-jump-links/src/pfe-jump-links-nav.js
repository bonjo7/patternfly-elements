// Import polyfills: findIndex, closest
import "./polyfills--pfe-jump-links-nav.js";

import PFElement from "../../pfelement/dist/pfelement.js";

class PfeJumpLinksNav extends PFElement {
  static get tag() {
    return "pfe-jump-links-nav";
  }

  get templateUrl() {
    return "pfe-jump-links-nav.html";
  }

  get styleUrl() {
    return "pfe-jump-links-nav.scss";
  }

  static get PfeType() {
    return PFElement.PfeTypes.Content;
  }

  static get events() {
    return {
      activeNavItem: `pfe-jump-links-panel:active-navItem`,
    }
  }

  static get observer() {
    return {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
    };
  }

  static get properties() {
    return {
      autobuild: {
        title: "Autobuild",
        type: Boolean,
      },
      horizontal: {
        title: "Horizontal",
        type: Boolean,
        default: false,
      },
      srText: {
        title: "Screen reader text",
        type: String,
        default: "Jump to section",
      },
      color: {
        title: "Color",
        type: String,
        values: ["darkest"],
      },
      offset: {
        title: "Offset",
        type: Number,
        observer: "_offsetChanged",
      },
      // @TODO: Deprecated in 2.0
      oldAutobuild: {
        alias: "autobuild",
        attr: "pfe-c-autobuild",
      },
      // @TODO: Deprecated in 2.0
      oldHorizontal: {
        alias: "horizontal",
        attr: "pfe-c-horizontal",
      },
      // @TODO: Deprecated in 2.0
      oldColor: {
        alias: "color",
        attr: "pfe-color",
      },
    };
  }

  get header() {
    if (!this.horizontal) return this.shadowRoot.querySelector("pfe-accordion-header");

    return this.getSlot(["heading", "pfe-jump-links-nav--heading"])[0];
  }

  get panel() {
    // Use the ID from the navigation to target the panel elements
    // Automatically if there's only one set of tags on the page
    if (this.id) {
      this.removeAttribute("hidden");
      return document.querySelector(`[scrolltarget=${this.id}]`);
    } else {
      this.id = this.randomId;
      const panels = document.querySelectorAll("pfe-jump-links-panel");
      if (panels.length === 1) {
        this.removeAttribute("hidden");
        panels[0].setAttribute("scrolltarget", this.id);
        return panels[0];
      } else if (panels.length > 1) {
        this.warn(
          `Cannot locate which panel is connected to this navigation element.${
            this.id ? ` Please add scrolltarget="${this.id}" to the appropriate panel.` : ""
          }`
        );
      } else {
        this.warn(
          `Cannot locate any panels on this page. Please add a pfe-jump-links-panel element around the content you want to target.`
        );
      }
    }

    // Hide the navigation if no content can be found
    this.setAttribute("hidden", "");
    return;
  }

  get links() {
    return this._menuContainer.querySelectorAll("a");
  }

  get items() {
    return [...this.shadowRoot.querySelectorAll(`.${this.tag}__item`)];
  }

  get sections() {
    return this.panel.querySelectorAll(`.pfe-jump-links-panel__section`) ||
      this.panel.shadowRoot.querySelectorAll(`.pfe-jump-links-panel__section`);
  }

  get offsetValue() {
    return this.offset || parseInt(this.cssVariable(`pfe-jump-links--offset`) || this.cssVariable(`pfe-jump-links-panel--offset`), 10) || 0;
  }

  constructor() {
    super(PfeJumpLinksNav, {
      type: PfeJumpLinksNav.PfeType,
    });

    this.isBuilding = false;

    this.build = this.build.bind(this);
    this._buildWrapper = this._buildWrapper.bind(this);
    this._buildItem = this._buildItem.bind(this);
    this._init = this._init.bind(this);

    this._reportHeight = this._reportHeight.bind(this);
    this.closeAccordion = this.closeAccordion.bind(this);

    this._observer = new MutationObserver(this._init);
  }

  connectedCallback() {
    super.connectedCallback();

    // Do not try to render navigation in IE11
    if (this.isIE11) {
      this.setAttribute("hidden", "");
      return;
    }

    // Templated elements in the shadow DOM
    this._menuContainer = this.shadowRoot.querySelector("#container");

    this._init();

    document.addEventListener(PfeJumpLinksNav.events.activeNavItem, (evt) => {
      this.clearActive();
      this.active(evt.detail.activeNavItem);
    });

    // Re-initialize if the panel content changes
    document.addEventListener("pfe-jump-links-panel:change", this._init);
  }

  disconnectedCallback() {
    super.disconnectedCallback();

    this._observer.disconnect();

    document.removeEventListener("pfe-jump-links-panel:change", this._init);
    document.removeEventListener(PfeJumpLinksNav.events.activeNavItem, (evt) => {
      this.clearActive();
      this.active(evt.detail.activeNavItem);
    });
  }

  build(data) {
    this.isBuilding = true;
    let sections = data || this.sections;

    // Can't build the navigation dynamically without panel sections defined
    if (!sections) return;

    // Validations complete, start the build
    let child;
    let wrapper = this._buildWrapper();
    let currentWrapper = wrapper;
    let previousWrapper = currentWrapper;

    // Build markup for the navigation
    for (let i = 0; i < sections.length; i++) {
      const sectionHeading = sections[i];
      let is_subsection = sectionHeading.classList.contains("sub-section");
      let has_subsection = sectionHeading.classList.contains("has-sub-section");

      // Get ID for the navigation
      let id = sectionHeading.id;
      if (!id) {
        let spacer = sectionHeading.previousElementSibling;
        if (spacer && spacer.classList.contains("pfe-jump-links__section--spacer") && spacer.id) {
          id = spacer.id;
        } else {
          sectionHeading.id = this.randomId.replace("pfe-", "pfe-jump-links--");
          id = sectionHeading.id;
        }
      }

      // Build the li tag; the child item
      child = this._buildItem(
        {
          target: id,
          content: sectionHeading.getAttribute("nav-label") || sectionHeading.innerHTML,
          subsection: has_subsection,
        },
        is_subsection
      );

      // Add the item to the list
      currentWrapper.appendChild(child);

      if (has_subsection) {
        previousWrapper = currentWrapper;
        currentWrapper = this._buildWrapper("sub-nav");
        child.appendChild(currentWrapper);
      }

      // If the next item exists and is a sub-section, reset the ul build to the previous one
      if (sections[i + 1] && !sections[i + 1].classList.contains("sub-section")) {
        currentWrapper = previousWrapper || wrapper;
      }
    }

    this._menuContainer.innerHTML = wrapper.outerHTML.toString();

    this.isBuilding = false;
  }

  closeAccordion() {
    // @TODO
    // Create JSON tokens for media query breakpoints
    if (window.matchMedia("(min-width: 992px)").matches) {
      return;
    }
    const accordion = this.shadowRoot.querySelector("pfe-accordion");
    setTimeout(() => {
      Promise.all([customElements.whenDefined("pfe-accordion")]).then(() => {
        accordion.collapseAll();
      });
    }, 750);
  }

  rebuild() {
    // If the build is happening, wait until it is complete
    if (!this.isBuilding) {
      setTimeout(rebuild, 100);
    } else this.build();
  }

  // Accepts an index or the link element itself
  active(item) {
    let idx;
    let items = this.items;

    if (typeof item === "number") idx = item;
    else idx = items.findIndex((el) => el === item);

    // If idx is less than 0, it could not be found
    if (idx < 0 || idx >= items.length || !items[idx]) return;

    const li = items[idx].closest("li");
    const parentli = li.closest("ul").closest("li");
    const is_subsection = li.classList.contains("sub-section");
    const has_subsection = li.classList.contains("has-sub-section");

    li.setAttribute("active", "");
    if (has_subsection) {
      li.classList.remove("expand");
    } else if (is_subsection) {
      parentli.setAttribute("active", "");
      parentli.classList.remove("expand");
    }
  }

  inactive(item) {
    let idx;
    let items = this.items;

    if (typeof item === "number") idx = item;
    else idx = items.findIndex((el) => el === item);

    // If idx is less than 0, it could not be found
    if (idx < 0 || idx >= items.length || !items[idx]) return;

    const li = items[idx].closest("li");
    const parentli = li.closest("ul").closest("li");
    const is_subsection = li.classList.contains("sub-section");
    const has_subsection = li.classList.contains("has-sub-section");

    li.removeAttribute("active");
    if (has_subsection) {
      li.classList.add("expand");
    } else if (is_subsection) {
      parentli.removeAttribute("active");
      parentli.classList.add("expand");
    }
  }

  clearActive() {
    const items = this.items;
    items.forEach((item) => this.inactive(item));
  }

  _buildItem(data, isSubSection = false) {
    let item = document.createElement("li");
    item.className = "pfe-jump-links-nav__item";

    let link = document.createElement("a");
    link.className = "pfe-jump-links-nav__link";
    link.href = `#${data.target}`;
    link.setAttribute("data-target", data.target);
    link.innerHTML = data.content;

    if (data.subsection) item.classList.add("has-sub-section");
    if (isSubSection) item.classList.add("sub-section");

    item.appendChild(link);
    return item;
  }

  _buildWrapper(className = "pfe-jump-links-nav") {
    let wrapper = document.createElement("ul");
    wrapper.className = className;
    return wrapper;
  }

  // Run this if the component is _not_ set to autobuild
  _isValidLightDom() {
    if (!this.hasLightDOM()) {
      this.warn(
        `This component requires an unordered list in the light DOM to render; alternatively, add the attribute \`autobuild\` attribute to dynamically generate the list.`
      );
      return false;
    }

    if (
      (this.hasSlot(["logo", "pfe-jump-links-nav--logo"]) || this.hasSlot(["link", "pfe-jump-links-nav--link"])) &&
      !this.horizontal
    ) {
      this.warn(`The logo and link slots are NOT supported in vertical jump links.`);
    }
    
    if (!this.querySelector("ul")) {
      if (!this.horizontal && !this.autobuild) {
        this.warn(`The mark-up for the navigation should contain a <ul> element`);
      }

      return false;
    }

    if (Number.isInteger(Number(this.customVar))) {
      this.warn(
        "Using an integer with a unit is not supported for custom property --pfe-jump-links-panel--offset. The component strips the unit using parseInt(). For example so 1rem would become 1 and behave as if you had entered 1px. Values with a pixel unit will behave correctly."
      );
    }

    return true;
  }

  _reportHeight() {
    const cssVarName = `--${this.tag}--Height--actual`;
    const styles = window.getComputedStyle(this);

    let height = styles.getPropertyValue("height");
    if (window.matchMedia("(min-width: 992px)").matches) {
      height = "0px";
    }

    // Set it on the panel or the document
    if (this.panel) this.panel.style.setProperty(cssVarName, height);
    else document.documentElement.style.setProperty(cssVarName, height);
  }

  _init() {
    if (window.ShadyCSS) this._observer.disconnect();

    // Check that the light DOM is there and accurate
    if (!this.autobuild && this._isValidLightDom()) {
      const menu = this.querySelector("ul");

      // If the class is not already on the list wrapper
      if (!menu.classList.contains("pfe-jump-links-nav")) {
        menu.classList.add("pfe-jump-links-nav");
      }

      // Move the menu into the shadow DOM
      this._menuContainer.innerHTML = menu.outerHTML.toString();

      // Build the label for screen readers
      // let label = document.createElement("h2");
      // label.className = "sr-only";
      // label.setAttribute("hidden", "");
      // label.innerText = this.srText;

      this.shadowRoot.querySelector("nav").prepend(label);
    } else {
      // Try to build the navigation based on the panel
      this.build();
    }

    this._reportHeight();

    // Attach the event listeners
    [...this.links].forEach((link) => {
      link.addEventListener("click", () => {
        this.clearActive();
        this.active(link.closest(`.${this.tag}__item`));
        this.closeAccordion();
      });
    });

    if (this.autobuild) {
      document.addEventListener("pfe-jump-links-panel:change", this._init);
    }

    // Trigger the mutation observer
    if (window.ShadyCSS) {
      this._observer.observe(this, PfeJumpLinksNav.observer);
    }
  }

  _scrollCallback() {
    // Make an array from the node list
    const sections = [...this.sections];

    // Get all the sections that match this point in the scroll
    const matches = sections.filter((section) => {
      return (
        section.getBoundingClientRect().top > this.offsetValue &&
        section.getBoundingClientRect().bottom < window.innerHeight
      );
    });

    // Don't change anything if no items were found
    if (matches.length === 0) return;

    // Identify the first one queried as the current section
    let current = matches[0];
    console.log({
      current: current.getAttribute("data-target"),
      matches: matches.map((item) => item.getAttribute("data-target")).join(", "),
    });

    // If there is more than 1 match, check it's distance from the top
    // whichever is within 200px, that is our current.
    if (matches.length > 1) {
      const close = matches.filter((section) => section.getBoundingClientRect().top <= 200);
      // If 1 or more items are found, use the last one.
      if (close.length > 0) current = close[close.length - 1];
    }

    if (current) {
      const currentIdx = sections.indexOf(current);

      // If that section isn't already active,
      // remove active from the other links and make it active
      if (currentIdx !== this.currentActive) {
        this.currentActive = currentIdx;
        this.emitEvent(PfeJumpLinksPanel.events.activeNavItem, {
          detail: {
            activeNavItem: currentIdx,
          },
        });
      }
    }
  }
}

export default PfeJumpLinksNav;
