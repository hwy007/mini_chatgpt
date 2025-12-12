import { ThoughtStep } from '../types';
import { ChevronRight } from 'lucide-react';
import { useState } from 'react';

interface ThoughtProcessProps {
  steps: ThoughtStep[];
}

export function ThoughtProcess({ steps }: ThoughtProcessProps) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <details
      open={isOpen}
      className="thought-process rounded-lg p-3 mb-3 text-xs overflow-hidden"
    >
      <summary
        onClick={(e) => {
          e.preventDefault();
          setIsOpen(!isOpen);
        }}
        className="cursor-pointer text-slate-500 flex items-center hover:text-indigo-600 transition-colors select-none"
      >
        <ChevronRight
          className={`w-3 h-3 mr-2 transition-transform duration-200 ${
            isOpen ? 'rotate-90' : ''
          }`}
        />
        思考过程 & 工具调用
      </summary>
      {isOpen && (
        <div className="mt-2 font-mono text-slate-600 space-y-1 pl-4 border-l border-slate-300">
          {steps.map((step, index) => (
            <div
              key={index}
              className={
                step.type === 'thought'
                  ? 'text-blue-600'
                  : step.type === 'action'
                  ? 'text-orange-600'
                  : 'text-green-600'
              }
            >
              {step.type === 'thought' && 'Thought: '}
              {step.type === 'action' && 'Action: '}
              {step.type === 'observation' && 'Observation: '}
              {step.content}
            </div>
          ))}
        </div>
      )}
    </details>
  );
}
