import { CollageCreator } from "@/components/CollageCreator";
import { AppLayout } from "@/components/AppLayout";

const AppPage300 = () => {
  return (
    <AppLayout>
      <div className="p-6">
        <CollageCreator dpi={300} maxHeight={200} mode="hd" />
      </div>
    </AppLayout>
  );
};

export default AppPage300;
