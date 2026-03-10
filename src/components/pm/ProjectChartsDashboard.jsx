import React from 'react';
import { LayoutDashboard } from 'lucide-react';
import { BudgetVsActualBarChart, CostMixPieChart } from '@/components/pm/ProjectBudgetCharts';
import { ProjectSpendOverTimeChart } from '@/components/pm/ProjectSpendOverTimeChart';
import { TaskProgressChart, VarianceBarChart } from '@/components/pm/ProjectProgressCharts';

const ProjectChartsDashboard = ({
  sowItems = [],
  estimates = {},
  tasks = [],
  transactions = [],
  materials = [],
}) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <LayoutDashboard className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">Project dashboard</h2>
      </div>
      <p className="text-sm text-muted-foreground -mt-2 mb-4">
        Budget, spend, and progress at a glance.
      </p>

      {/* Row 1: Budget vs Actual + Cost Mix */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BudgetVsActualBarChart sowItems={sowItems} estimates={estimates} />
        <CostMixPieChart sowItems={sowItems} estimates={estimates} />
      </div>

      {/* Row 2: Spend over time */}
      <ProjectSpendOverTimeChart transactions={transactions} materials={materials} />

      {/* Row 3: Task progress + Variance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TaskProgressChart tasks={tasks} />
        <VarianceBarChart sowItems={sowItems} estimates={estimates} />
      </div>
    </div>
  );
};

export default ProjectChartsDashboard;
