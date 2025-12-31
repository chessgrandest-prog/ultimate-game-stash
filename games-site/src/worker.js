import React from 'react';
import Head from 'next/head';
import { Request } from 'undici';
import { RequestContext } from 'undici';
import { RequestContextType } from 'undici';

const GameList = ({ games }) => {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center' }}>
      {games.map((game) => (
        <div key={game.title} style={{ margin: '16px', border: '1px solid #ccc', padding: '8px', textAlign: 'center' }}>
          <iframe
            src={game.url}
            title={game.title}
            width="600"
            height="400"
            style={{ border: 'none' }}
          />
          <p>{game.title}</p>
        </div>
      ))}
    </div>
  );
};

export async function getStaticProps() {
  const response = await fetch('/games+img.json');
  const games = await response.json();

  return {
    props: {
      games,
    },
    revalidate: 10,
  };
}

export default GameList;
