import React, { useEffect, useRef, useState } from 'react';
import { Line } from 'react-chartjs-2';
import 'chart.js/auto';
import '../App.css'; // Asegúrate de importar el archivo CSS

const TrajectoryCharts = ({ trajectory }) => {
  const containerRef = useRef(null);
  const lineChartRef = useRef(null);
  const [fontSize, setFontSize] = useState(10);

  useEffect(() => {
    const interval = setInterval(() => {
      if (lineChartRef.current && lineChartRef.current.chartInstance) {
        lineChartRef.current.chartInstance.update();
      }
    }, 1000); // Actualiza cada 1 segundo

    return () => clearInterval(interval);
  }, [trajectory]);

  useEffect(() => {
    const updateFontSize = () => {
      if (containerRef.current) {
        const { offsetWidth, offsetHeight } = containerRef.current;
        const newSize = Math.min(offsetWidth, offsetHeight) / 20; // Ajusta el divisor para cambiar la escala
        setFontSize(newSize);
      }
    };

    updateFontSize();
    window.addEventListener('resize', updateFontSize);

    return () => window.removeEventListener('resize', updateFontSize);
  }, []);

  const data = {
    labels: trajectory.map((_, index) => index * 0.1), // Ajusta el tiempo de simulación (dt)
    datasets: [
      {
        label: 'X',
        data: trajectory.map(point => point[0]),
        borderColor: 'blue',
        fill: false,
        pointRadius: 0, // Quitar los círculos
      },
      {
        label: 'Y',
        data: trajectory.map(point => point[1]),
        borderColor: 'green',
        fill: false,
        pointRadius: 0, // Quitar los círculos
      },
      {
        label: 'th',
        data: trajectory.map(point => point[2]),
        borderColor: 'red',
        fill: false,
        pointRadius: 0, // Quitar los círculos
      },
      {
        label: 'v',
        data: trajectory.map(point => point[3]),
        borderColor: 'orange',
        fill: false,
        pointRadius: 0, // Quitar los círculos
      },
      {
        label: 'w',
        data: trajectory.map(point => point[4]),
        borderColor: 'purple',
        fill: false,
        pointRadius: 0, // Quitar los círculos
      },
    ],
  };

  const options = {
    animation: false,
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        title: {
          display: true,
          text: 'Tiempo (s)',
          padding: 0,
          font: {
            size: fontSize,
          },
        },
        ticks: {
          callback: function (value, index, values) {
            // Mostrar solo las etiquetas en 0, 1, 2, 3, 4 y 5 segundos
            return value % 10 === 0 && value >= 0 && value <= 50 ? value / 10 : null;
          },
          font: {
            size: fontSize * 0.8,
          },
          maxTicksLimit: 6,
        }
      },
      y: {
        title: {
          display: true,
          text: 'Valor',
          padding: 0,
          font: {
            size: fontSize,
          },
        },
        ticks: {
          padding: fontSize * 0.15,
          font: {
            size: fontSize,
          },
        }
      },
    },
    plugins: {
      legend: {
        labels: {
          boxWidth: fontSize * 0.8, // Ajusta el tamaño de los cuadrados de la leyenda
          padding: 0, // Opcional: Ajusta el espacio alrededor de las etiquetas de la leyenda
          font: {
            size: fontSize * 1.5,
          },
          usePointStyle: true,
          pointStyle: 'dash',
        }
      }
    }
  };

  return (
    <div className="chart-container" ref={containerRef}>
      <Line ref={lineChartRef} data={data} options={options} />
    </div>
  );
};

export default TrajectoryCharts;
