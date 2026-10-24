import { AiTag } from '../ui/Badges'
import { Icon } from '../ui/Icon'

/** Footer: the "nothing is hidden" promise and a one-line glossary of the four signals shown in each row. */
export function FindingsLegend() {
  return (
    <footer className="fx-foot">
      <p className="fx-foot__note">
        <Icon name="info" size={14} />
        Every finding from the scan is listed. Filters only change what you see; they never change priority.
      </p>
      <dl className="fx-legend">
        <div>
          <dt>Priority</dt>
          <dd>
            The recommended action, set by fixed published rules: known exploited (KEV), severity, production use, EPSS and confirmed code
            usage. AI can only raise it. Only a reviewer can lower it, one step.
          </dd>
        </div>
        <div>
          <dt>Severity</dt>
          <dd>How serious the flaw is if it is exploited, as rated by the advisory. It does not say whether anyone is exploiting it.</dd>
        </div>
        <div>
          <dt>EPSS</dt>
          <dd>
            FIRST.org's estimate of the chance of exploitation in the next 30 days. n/a means no score is published: unknown, not zero.
          </dd>
        </div>
        <div>
          <dt>
            AI verdict <AiTag>AI</AiTag>
          </dt>
          <dd>
            A model's reading of your code, drawn with a violet dashed border. It needs human confirmation. Only top direct-dependency
            findings are assessed, and Not assessed does not mean safe.
          </dd>
        </div>
      </dl>
    </footer>
  )
}
