import { listen } from './request';
import { EventCallback, LogEvent, JobStatusChangeEvent, ApiOption } from './interface';

/**
 * detector for catching error and call the callback, if type of `onError` is function.
 */
export function errorHandle() {
  return function (target: any, name: string, desc: any) {
    const original = desc.value;
    desc.value = async function (...args: any[]) {
      if (typeof this.onError === 'function') {
        try {
          return await original.apply(this, args);
        } catch (err) {
          this.onError(err);
        }
      } else {
        original.apply(this, args);
      }
    };
    return desc;
  };
}

export class BaseApi {
  onError: (err: Error) => void;
  route: string;

  constructor(uri: string, opts?: ApiOption) {
    this.route = uri;
    this.onError = opts?.onError;
  }

  /**
   * trace event
   * @param traceId trace id
   * @param eventCallback event callback
   */
  traceEvent(traceId: string, eventCallback: EventCallback): Promise<void> {
    return new Promise((resolve, reject) => {
      // TODO(feely): listen all event and transfer out
      listen(`${this.route}/event/${traceId}`, undefined, {
        'log': (e: MessageEvent) => {
          const eventObj = JSON.parse(e.data) as LogEvent;
          if (typeof eventCallback === 'function') {
            eventCallback('log', eventObj);
          }
        },
        'job_status': (e: MessageEvent) => {
          const eventObj = JSON.parse(e.data) as JobStatusChangeEvent;
          if (typeof eventCallback === 'function') {
            eventCallback('job_status', eventObj);
          }
        },
        'error': (e: MessageEvent) => {
          reject(new Error(e.data));
        },
        'close': () => {
          resolve();
        }
      });
    });
  }
}