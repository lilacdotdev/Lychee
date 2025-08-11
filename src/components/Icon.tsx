import { createEffect, JSX } from "solid-js";
import * as feather from "feather-icons";

interface IconProps {
  name: string;
  size?: number;
  class?: string;
  onClick?: () => void;
  title?: string;
}

export function Icon(props: IconProps): JSX.Element {
  let iconRef: SVGSVGElement | undefined;

  createEffect(() => {
    if (iconRef && feather.icons[props.name as keyof typeof feather.icons]) {
      // Get the SVG string from Feather Icons without any predefined classes or colors
      const svgString = feather.icons[props.name as keyof typeof feather.icons].toSvg({
        width: props.size || 20,
        height: props.size || 20,
        'stroke-width': 2,
        stroke: 'currentColor',
        fill: 'none'
      });
      
      // Parse and insert the SVG
      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(svgString, 'image/svg+xml');
      const svgElement = svgDoc.documentElement as any;
      
      // Clear and replace content
      iconRef.innerHTML = svgElement.innerHTML;
      
      // Copy only essential attributes, excluding any color-related ones
      Array.from(svgElement.attributes).forEach((attr: any) => {
        if (attr.name !== 'xmlns' && attr.name !== 'class' && attr.name !== 'stroke' && attr.name !== 'fill') {
          iconRef?.setAttribute(attr.name, attr.value);
        }
      });
      
      // Ensure all child elements use currentColor
      const allElements = iconRef.querySelectorAll('*');
      allElements.forEach(el => {
        el.setAttribute('stroke', 'currentColor');
        el.setAttribute('fill', 'none');
      });
      
      // Set title if provided
      if (props.title && iconRef) {
        iconRef.setAttribute('title', props.title);
      }
    }
  });

  const svgElement = (
    <svg
      ref={iconRef}
      class={`icon ${props.class || ''}`}
      onClick={props.onClick}
      style={{
        width: `${props.size || 20}px`,
        height: `${props.size || 20}px`,
        cursor: props.onClick ? 'pointer' : 'default'
      }}
    />
  );

  // If we have a title and no onClick, wrap in a div with title
  if (props.title && !props.onClick) {
    return (
      <div title={props.title} style={{ display: 'inline-flex' }}>
        {svgElement}
      </div>
    );
  }

  return svgElement;
}