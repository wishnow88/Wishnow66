import { useState, useEffect } from 'react';
import Head from 'next/head';
import PaymentUI from '../components/PaymentUI';

export default function Home() {
  return (
    <>
      <Head>
        <title>WISH STORE · IMEI Premium Service</title>
        <meta name="description" content="WISH STORE IMEI Premium Service with Casaku Payment" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <PaymentUI />
    </>
  );
}