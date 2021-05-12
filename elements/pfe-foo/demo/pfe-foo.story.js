import { storiesOf } from "@storybook/polymer";
import * as bridge from "@storybook/addon-knobs";
import { withActions } from "@storybook/addon-actions";
import * as tools from "../../../.storybook/utils.js";

import PfeFoo from "../dist/pfe-foo";

const stories = storiesOf("Foo", module);

// Add the readme
import readme from "../README.md";
stories.addParameters({
  notes: {
    markdown: readme
  }
});

// Define the template to be used
const template = (data = {}) => {
  return tools.component(PfeFoo.tag, data.prop, data.slots);
};

// Use these to get dynamically generated content
// const defaultHeading = tools.autoHeading(true);
const defaultContent = tools.autoContent(1, 2);

stories.addDecorator(bridge.withKnobs);

stories.add(PfeFoo.tag, () => {
  let config = {};
  const props = PfeFoo.properties;

  //-- Set any custom defaults just for storybook here
  let overrides = {};
  // Example:
  // let overrides = {
  //   color: {
  //     default: "lightest",
  //     required: true
  //   }
  // };

  // Trigger the auto generation of the knobs for attributes
  config.prop = tools.autoPropKnobs(PfeFoo, overrides);

  const slots = PfeFoo.slots;

  //-- Set any custom content for the slots here

  // Trigger the auto generation of the knobs for slots
  config.has = tools.autoContentKnobs(slots, bridge);

  //-- Build your slots here using config.has[""] to get user content
  // prettier-ignore
  config.slots = [{
    content: defaultContent
  }];

  //-- Reset default values show they don't render in the markup
  // if (config.prop[""] === "default") {
  //   config.prop[""] = "";
  // }

  const rendered = template(config);
  return tools.preview(rendered);
});
