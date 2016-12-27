import React from 'react'
import { container } from '@graphistry/falcor-react-redux';
import {
    Slider,
    TextInput,
    ToggleButton,
    ColorPicker,
    SettingsList,
    ControlsList,
} from 'viz-shared/components/settings'

import { setControlValue } from 'viz-shared/actions/settings';

const controlsById = {
    // 'display-time-zone': displayTimeZoneInput
};

const controlsByType = {
    'text': TextInput,
    'bool': ToggleButton,
    'color': ColorPicker,
    'discrete': Slider,
    'continuous': Slider
};

let Settings = ({ id, name, settings = [], ...props } = {}) => {
    return (
        <SettingsList name={name} {...props}>
        {settings.map((options, index) => (
            <Options data={options} key={`${index}: ${options.name}`}/>
        ))}
        </SettingsList>
    );
};

let Options = ({ name, options = [], ...props } = {}) => {
    return (
        <ControlsList name={name}  {...props}>
        {options.map((control, index) => (
            <Control data={control} key={`${index}: ${control.id}`}/>
        ))}
        </ControlsList>
    );
};

let Control = ({ id, type, ...rest } = {}) => {
    const Component = controlsById[id] || controlsByType[type];
    if (!Component) {
        return null;
    }
    return (
        <Component id={id} type={type} {...rest}/>
   );
};

Settings = container({
    renderLoading: false,
    fragment: ({ settings = [] } = {}) => `{
        id, name, settings: {
            length, ... ${
                Options.fragments(settings)
            }
        }
    }`
})(Settings);

Options = container({
    renderLoading: false,
    fragment: (options = []) => `{
        name, length, ...${
            Control.fragments(options)
        }
    }`,
    mapFragment: (options) => ({
        options, name: options.name
    })
})(Options);

Control = container({
    renderLoading: false,
    fragment: () => `{ id, name, type, props, value: {${null}} }`,
    dispatchers: {
        setValue: setControlValue
    }
})(Control);

export { Settings, Options, Control };