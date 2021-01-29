import * as pulumi from '@pulumi/pulumi';
import * as shell from 'shelljs';
import * as path from 'path';

type HelmChartInputs = {
  [K in keyof HelmChartOptions]: pulumi.Unwrap<HelmChartOptions[K]>;
};

interface HelmChartOutputs extends HelmChartInputs {
  revision: string;
}

export class HelmChartProvider implements pulumi.dynamic.ResourceProvider {
  async check(
    olds: HelmChartInputs,
    news: HelmChartInputs
  ): Promise<pulumi.dynamic.CheckResult> {
    return {
      inputs: news,
    };
  }

  async diff(
    id: string,
    previousOutput: HelmChartOutputs,
    news: HelmChartInputs
  ): Promise<pulumi.dynamic.DiffResult> {
    let deleteBeforeReplace = false;
    const replaces: string[] = [];

    if (previousOutput.releaseName !== news.releaseName) {
      deleteBeforeReplace = true;
      replaces.push('releaseName');
    }

    return {
      changes: true,
      replaces,
      deleteBeforeReplace,
    };
  }

  async update(
    id: string,
    currentOutputs: HelmChartOutputs,
    newInputs: HelmChartInputs
  ): Promise<pulumi.dynamic.UpdateResult> {
    const o = await this.createOrUpdate(newInputs);
    const outs: HelmChartOutputs = {
      ...newInputs,
      ...o,
    };
    return {
      outs,
    };
  }

  async createOrUpdate(inputs: HelmChartInputs): Promise<{ revision: string }> {
    shell.exec(`helm repo add ${inputs.repo.name} ${inputs.repo.url}`);
    if (inputs.yamlOutputDir) {
      const outputFilePath = path.resolve(
        inputs.yamlOutputDir,
        `${inputs.releaseName}.yaml`
      );
      shell.mkdir(inputs.yamlOutputDir!);
      shell.exec(
        `helm template ${inputs.releaseName} ${inputs.repo.name}/${inputs.chart} > ${outputFilePath}`
      );
    }

    shell.exec(
      `helm upgrade ${inputs.releaseName} ${inputs.repo.name}/${inputs.chart} --namespace ${inputs.namespace} --install --create-namespace --wait`
    );

    return {
      revision: '1',
    };
  }

  async create(inputs: HelmChartInputs): Promise<pulumi.dynamic.CreateResult> {
    const o = await this.createOrUpdate(inputs);
    const outs: HelmChartOutputs = {
      ...inputs,
      ...o,
    };
    return {
      id: inputs.releaseName,
      outs,
    };
  }

  async delete(id: string, props: HelmChartOutputs): Promise<void> {
    shell.exec(
      `helm uninstall ${props.releaseName} --namespace ${props.namespace}`
    );
    console.log(`Delete ${id}`, {});
  }
}

export interface HelmChartOptions {
  chart: pulumi.Input<string>;
  releaseName: pulumi.Input<string>;
  namespace: pulumi.Input<string>;
  repo: {
    name: pulumi.Input<string>;
    url: pulumi.Input<string>;
  };
  yamlOutputDir?: pulumi.Input<string>;
}

export class HelmChart extends pulumi.dynamic.Resource {
  constructor(
    name: string,
    args: HelmChartOptions,
    options?: pulumi.CustomResourceOptions
  ) {
    super(new HelmChartProvider(), `pulumi-helm:chart${name}`, args, options);
  }
}
