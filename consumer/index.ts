import * as pulumi from '@pulumi/pulumi';
import { HelmChart } from '../src';
import * as path from 'path';

const myChart = new HelmChart('cert-manager', {
  chart: 'cert-manager',
  namespace: 'cert-manager',
  releaseName: 'cert-manager-release',
  repo: {
    name: 'jetstack',
    url: 'https://charts.jetstack.io',
  },
  yamlOutputDir: path.resolve(__dirname, 'dist'),
});
