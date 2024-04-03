import { plainToInstance } from 'class-transformer';
import React, { useEffect, useState } from 'react';

import { FailedFavoriteItem } from '../../types/favorite/favorite-item.type';
import { Context } from '../../types/window/context.type';
import './progress.css';

declare const Progress: {
  getContext: () => Context;
  resetContext: () => Context;
  import: () => void;
  export: () => void;
  view: (failedItem: FailedFavoriteItem) => void;
};

const labels = {
  PENDING: '시작',
  WORKING: '진행중',
  COMPLETE: '완료',
};

export const App = () => {
  const [ctx, setCtx] = useState<Context>(Context.blank());
  useEffect(() => {
    const updated = () => setCtx(plainToInstance(Context, Progress.getContext() ?? Context.blank()));
    window.addEventListener('context-update', updated);
    return () => window.removeEventListener('context-update', updated);
  }, []);

  return (
    <div id="progress-wrap">
      <ol>
        {ctx.source && (
          <li className={`progress-wrap${ctx.source.status !== 'COMPLETE' ? ' active' : ''}`}>
            <div className="progress-item">
              <span className="progress-seq">1</span>
              <div>
                <strong>{ctx.source.name}</strong>
                (으)로부터 데이터를 가져옵니다.
                <br />
                <div className="desc">로그인 화면이 표시될 수 있습니다.</div>
                {ctx.source.status !== 'COMPLETE' && (
                  <button disabled={ctx.source.status === 'WORKING'} onClick={() => Progress.import()}>
                    {labels[ctx.source.status]}
                  </button>
                )}
                <div>{ctx.source.progress?.map((txt, idx) => <div key={idx + txt}>{txt}</div>)}</div>
                {ctx.source.status === 'COMPLETE' && (
                  <ul className="folders">
                    {ctx.source.result?.map((folder) => (
                      <li key={folder.name}>
                        {folder.name} ({folder.items.length})
                      </li>
                    ))}
                  </ul>
                )}
                {ctx.source.error && <div className="error">{ctx.source.error}</div>}
              </div>
            </div>
          </li>
        )}
        {ctx.target && (
          <li className={`progress-wrap${ctx.source.status === 'COMPLETE' ? ' active' : ''}`}>
            <div className="progress-item">
              <span className="progress-seq">2</span>
              <div>
                <strong>{ctx.target.name}</strong>
                (으)로 데이터를 저장합니다.
                <br />
                <div className="desc">로그인 화면이 표시될 수 있습니다.</div>
                {ctx.source.status === 'COMPLETE' && ctx.target.status !== 'COMPLETE' && (
                  <button disabled={ctx.target.status === 'WORKING'} onClick={() => Progress.export()}>
                    {labels[ctx.target.status]}
                  </button>
                )}
                <div>{ctx.target.progress?.map((txt, idx) => <div key={idx + txt}>{txt}</div>)}</div>
                {ctx.target.error && <div className="error">{ctx.target.error}</div>}
                {ctx.target.failed && (
                  <ul className="failed-items">
                    {ctx.target.failed.map((failed, idx) => (
                      <li key={idx} className="failed-item">
                        <a onClick={() => Progress.view(failed)}>
                          {failed.name}
                          <br />
                          <small>{failed.address}</small>
                        </a>
                        <br />
                        <span className="error">{failed.message}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </li>
        )}

        {ctx.source && ctx.source.status !== 'PENDING' && (
          <>
            <hr />
            <div style={{ paddingTop: 40 }}>
              <button onClick={() => Progress.resetContext()} style={{ backgroundColor: 'gray' }}>
                처음부터
              </button>
            </div>
          </>
        )}
      </ol>
    </div>
  );
};
