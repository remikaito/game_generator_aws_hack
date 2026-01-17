import { Check, Loader2 } from 'lucide-react';
import type { SessionProgress } from '../types';

interface ProgressIndicatorProps {
  progress?: SessionProgress;
}

const STEPS = [
  { id: 'context', label: 'Analyzing Concept', icon: '🎯' },
  { id: 'layout', label: 'Designing Level', icon: '🗺️' },
  { id: 'generation', label: 'Generating Assets', icon: '🎨' },
  { id: 'assembly', label: 'Assembling Scene', icon: '🔧' },
];

/**
 * Progress indicator showing pipeline steps
 */
export function ProgressIndicator({ progress }: ProgressIndicatorProps) {
  const currentStepIndex = STEPS.findIndex((s) => s.id === progress?.step);

  return (
    <div className="w-full">
      <h2 className="text-xl font-semibold mb-6 text-center">
        Creating Your Game Prototype
      </h2>

      <div className="space-y-4">
        {STEPS.map((step, index) => {
          const isActive = step.id === progress?.step;
          const isComplete = index < currentStepIndex || progress?.step === 'ready';
          const isPending = index > currentStepIndex;

          return (
            <div
              key={step.id}
              className={`flex items-center gap-4 p-4 rounded-lg transition-all ${
                isActive
                  ? 'bg-game-accent/20 border border-game-accent'
                  : isComplete
                  ? 'bg-game-success/10 border border-game-success/30'
                  : 'bg-white/5 border border-white/10'
              }`}
            >
              {/* Icon */}
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  isActive
                    ? 'bg-game-accent'
                    : isComplete
                    ? 'bg-game-success'
                    : 'bg-white/10'
                }`}
              >
                {isComplete ? (
                  <Check size={20} />
                ) : isActive ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <span>{step.icon}</span>
                )}
              </div>

              {/* Label */}
              <div className="flex-1">
                <div
                  className={`font-medium ${
                    isPending ? 'text-gray-500' : 'text-white'
                  }`}
                >
                  {step.label}
                </div>
                {isActive && progress?.status === 'running' && (
                  <div className="text-sm text-gray-400 mt-1">
                    {progress.message || 'Processing...'}
                  </div>
                )}
              </div>

              {/* Progress bar for generation step */}
              {step.id === 'generation' && isActive && progress?.progress !== undefined && (
                <div className="w-20">
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-game-accent transition-all duration-300"
                      style={{ width: `${progress.progress}%` }}
                    />
                  </div>
                  <div className="text-xs text-gray-400 text-right mt-1">
                    {progress.progress}%
                  </div>
                </div>
              )}

              {/* Status indicator */}
              {isComplete && (
                <span className="text-game-success text-sm">Done</span>
              )}
            </div>
          );
        })}
      </div>

      {progress?.step === 'ready' && (
        <div className="mt-6 p-4 bg-game-success/20 border border-game-success/30 rounded-lg text-center">
          <span className="text-2xl mr-2">🎉</span>
          <span className="text-game-success font-medium">
            Your game prototype is ready!
          </span>
        </div>
      )}
    </div>
  );
}
